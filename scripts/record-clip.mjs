#!/usr/bin/env node
// AI Games Kit: record vertical gameplay footage. Needs playwright (+ ffmpeg on PATH for mp4 conversion).
// Usage: node scripts/record-clip.mjs <url | dir> [--seconds 25] [--size 540x960] [--actions showcase.json] [--out marketing/raw] [--name take1] [--clip]
// actions.json: [{"t":0,"type":"click","x":0.5,"y":0.6},{"t":800,"type":"key","key":"Space"},{"t":1500,"type":"move","x":0.2,"y":0.5},{"t":2000,"type":"hold","key":"ArrowRight","ms":600}]
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const VALUE_FLAGS = ['--seconds', '--size', '--actions', '--out', '--name'];
const target = args.find((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(args[i - 1])) || '.';
const seconds = Number(opt('seconds', 25)); const [W, H] = String(opt('size', '540x960')).split('x').map(Number);
const out = opt('out', 'marketing/raw'); const name = opt('name', 'take-' + Date.now());
const actions = opt('actions', null) ? JSON.parse(fs.readFileSync(opt('actions'), 'utf8')) : [];
fs.mkdirSync(out, { recursive: true });

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  try { const { createRequire } = await import('node:module'); return createRequire(path.join(process.cwd(), 'noop.js'))('playwright'); } catch {}
  return null; // resolves from the project's cwd, so install playwright in the game project
}
const playwright = await loadPlaywright();
if (!playwright) { console.error('playwright not found from '+process.cwd()+'. Run in your game project: npm i -D playwright && npx playwright install chromium'); process.exit(2); }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };
let server, url = target;
if (!/^https?:\/\//.test(target)) {
  const root = path.resolve(target);
  server = http.createServer((req, res) => { let p = path.join(root, decodeURIComponent(req.url.split('?')[0])); if (p.endsWith(path.sep)) p += 'index.html';
    if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
  await new Promise(r => server.listen(0, '127.0.0.1', r)); url = `http://127.0.0.1:${server.address().port}/`;
}
if (opt('clip', false)) url += (url.includes('?') ? '&' : '?') + 'clip=1';

const browser = await playwright.chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: true, deviceScaleFactor: 1, recordVideo: { dir: out, size: { width: W, height: H } } });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'load' });
const start = Date.now();
for (const a of actions.sort((x, y) => x.t - y.t)) {
  const wait = a.t - (Date.now() - start); if (wait > 0) await page.waitForTimeout(wait);
  if (a.type === 'click') await page.mouse.click(a.x * W, a.y * H);
  else if (a.type === 'move') await page.mouse.move(a.x * W, a.y * H, { steps: 8 });
  else if (a.type === 'key') await page.keyboard.press(a.key);
  else if (a.type === 'hold') { await page.keyboard.down(a.key); await page.waitForTimeout(a.ms || 400); await page.keyboard.up(a.key); }
}
const rest = seconds * 1000 - (Date.now() - start); if (rest > 0) await page.waitForTimeout(rest);
const video = page.video(); const final = path.join(out, name + '.webm');
await ctx.close(); await video.saveAs(final); await video.delete().catch(() => {}); await browser.close(); server?.close();
console.log('Recorded', final);

const ff = spawnSync('ffmpeg', ['-version']);
if (ff.status === 0) {
  const mp4 = path.join(out, name + '.mp4');
  const r = spawnSync('ffmpeg', ['-y', '-i', final, '-vf', 'scale=1080:1920:flags=lanczos,fps=60', '-c:v', 'libx264', '-crf', '24', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4], { stdio: 'ignore' });
  console.log(r.status === 0 ? 'Converted ' + mp4 : 'ffmpeg conversion failed; use the .webm');
} else console.log('ffmpeg not found; install it to convert to mp4 (see skill short-form-video).');
