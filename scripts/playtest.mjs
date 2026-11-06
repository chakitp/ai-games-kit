#!/usr/bin/env node
// AI Games Kit: automated smoke/perf test for web games. Needs: npm i -D playwright (and `npx playwright install chromium`).
// Usage: node scripts/playtest.mjs <url | dir> [--perf] [--cpu 4] [--seconds 4] [--out .aigk/qa] [--fps 55]
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const args = process.argv.slice(2);
const VALUE_FLAGS = ['--out', '--seconds', '--cpu', '--fps', '--mock-sdk'];
const target = args.find((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(args[i - 1])) || '.';
const opt = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const outDir = opt('out', '.aigk/qa'); const seconds = Number(opt('seconds', 4)); const cpu = Number(opt('cpu', 1));
const minFps = Number(opt('fps', 55)); const perf = !!opt('perf', false);
fs.mkdirSync(outDir, { recursive: true });

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  try { const { createRequire } = await import('node:module'); return createRequire(path.join(process.cwd(), 'noop.js'))('playwright'); } catch {}
  return null; // resolves from the project's cwd, so install playwright in the game project
}
const playwright = await loadPlaywright();
if (!playwright) { console.error('playwright not found from '+process.cwd()+'. Run in your game project: npm i -D playwright && npx playwright install chromium'); process.exit(2); }

// Static server for directories (file:// breaks fetch/modules).
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };
let server, url = target;
if (!/^https?:\/\//.test(target)) {
  const root = path.resolve(target);
  if (!fs.existsSync(path.join(root, 'index.html'))) { console.error(`No index.html in ${root}`); process.exit(2); }
  server = http.createServer((req, res) => {
    let p = path.join(root, decodeURIComponent(req.url.split('?')[0])); if (p.endsWith(path.sep)) p += 'index.html';
    if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  url = `http://127.0.0.1:${server.address().port}/`;
}
const origin = new URL(url).origin;
// --mock-sdk <poki|crazygames|youtube>: serve an offline fake of the portal SDK, record every call, and validate the sequence.
const mockSdk = opt('mock-sdk', null);
const SDK_URL = { poki: /poki-sdk|poki\.com.*sdk/i, crazygames: /crazygames-sdk/i, youtube: /youtube\.com\/game_api/i };
let mockSrc = null;
if (mockSdk) { const mp = path.join(path.dirname(new URL(import.meta.url).pathname), 'mock-sdks', mockSdk + '.js');
  if (!SDK_URL[mockSdk] || !fs.existsSync(mp)) { console.error('Unknown --mock-sdk ' + mockSdk); process.exit(2); } mockSrc = fs.readFileSync(mp, 'utf8'); }

const profiles = [
  { name: 'desktop', viewport: { width: 1280, height: 720 }, touch: false },
  { name: 'phone-portrait', viewport: { width: 390, height: 844 }, touch: true, mobile: true, dsf: 2 },
  { name: 'phone-landscape', viewport: { width: 844, height: 390 }, touch: true, mobile: true, dsf: 2 },
];

const browser = await playwright.chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const report = { url, date: new Date().toISOString(), profiles: [], failures: [], warnings: [] };

for (const p of profiles) {
  const ctx = await browser.newContext({ viewport: p.viewport, hasTouch: p.touch, isMobile: !!p.mobile, deviceScaleFactor: p.dsf || 1 });
  const page = await ctx.newPage();
  if (mockSdk) await page.route(u => !u.href.startsWith(origin) && !/^(data|blob):/.test(u.href), route => SDK_URL[mockSdk].test(route.request().url()) ? route.fulfill({ status: 200, contentType: 'text/javascript', body: mockSrc }) : route.abort());
  const errs = [], external = [], failed = [];
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) failed.push(`${r.status()} ${r.url()}`); });
  page.on('pageerror', e => errs.push('uncaught: ' + e.message));
  page.on('requestfailed', r => failed.push(r.url()));
  page.on('request', r => { const u = r.url(); if (!(mockSdk && SDK_URL[mockSdk].test(u)) && !u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u); });
  await page.addInitScript(() => {
    window.__frames = []; let last = performance.now();
    const tick = t => { window.__frames.push(t - last); last = t; requestAnimationFrame(tick); }; requestAnimationFrame(tick);
    // Detect non-finite numbers reaching canvas calls (NaN transforms are silently ignored and wreck rendering).
    window.__nan = { count: 0, first: null };
    for (const m of ['setTransform', 'transform', 'translate', 'scale', 'rotate', 'fillRect', 'strokeRect', 'clearRect', 'arc', 'ellipse', 'moveTo', 'lineTo', 'rect', 'drawImage', 'fillText', 'strokeText']) {
      const o = CanvasRenderingContext2D.prototype[m]; if (!o) continue;
      CanvasRenderingContext2D.prototype[m] = function (...a) { for (const v of a) if (typeof v === 'number' && !Number.isFinite(v)) { window.__nan.count++; window.__nan.first ??= m + '(' + a.join(',') + ')'; break; } return o.apply(this, a); };
    }
    window.__longTasks = 0; try { new PerformanceObserver(l => { window.__longTasks += l.getEntries().length; }).observe({ entryTypes: ['longtask'] }); } catch {}
  });
  const cdp = await ctx.newCDPSession(page);
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'load', timeout: 30000 }).catch(e => errs.push('goto: ' + e.message));
  const loadMs = Date.now() - t0;
  await page.waitForTimeout(800);
  const shot = f => page.screenshot({ path: path.join(outDir, `${p.name}-${f}.png`) });
  await shot('1-initial');

  // Input: tap/click center, keys, spam. Compare screenshots to detect reaction.
  const before = await page.screenshot();
  const vp = p.viewport;
  if (p.touch) { await page.touchscreen.tap(vp.width / 2, vp.height / 2); await page.waitForTimeout(300); await page.touchscreen.tap(vp.width / 2, vp.height * 0.7); }
  else { await page.mouse.click(vp.width / 2, vp.height / 2); await page.waitForTimeout(300); for (const k of ['Space', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'KeyA', 'KeyD']) { await page.keyboard.press(k); await page.waitForTimeout(80); } }
  await page.waitForTimeout(500);
  await shot('2-after-input');
  const afterInput = await page.screenshot();
  const reacted = !before.equals(afterInput);

  // Frame sampling
  await page.evaluate(() => { window.__frames.length = 0; window.__longTasks = 0; });
  const heapStart = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);
  for (let i = 0; i < seconds * 4; i++) { // random-ish input while sampling
    if (p.touch) await page.touchscreen.tap(20 + Math.random() * (vp.width - 40), 20 + Math.random() * (vp.height - 40));
    else await page.keyboard.press(['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'][i % 5]);
    await page.waitForTimeout(250);
  }
  const m = await page.evaluate(() => {
    const f = window.__frames.slice(5).sort((a, b) => a - b); const q = x => f.length ? f[Math.min(f.length - 1, Math.floor(f.length * x))] : 0;
    const c = document.querySelector('canvas'); const r = c?.getBoundingClientRect();
    return { n: f.length, med: q(0.5), p95: q(0.95), max: f[f.length - 1] || 0, longTasks: window.__longTasks,
      heap: performance.memory?.usedJSHeapSize || 0, hasCanvas: !!c, canvasW: r?.width || 0, canvasH: r?.height || 0,
      hScroll: document.documentElement.scrollWidth > innerWidth + 1, vScroll: document.documentElement.scrollHeight > innerHeight + 1,
      nan: window.__nan, iw: innerWidth, ih: innerHeight, paintFcp: performance.getEntriesByType('paint').find(e => e.name === 'first-contentful-paint')?.startTime || 0 };
  });
  await shot('3-after-play');
  const sdkLog = mockSdk ? await page.evaluate(() => window.__sdkLog || []) : null;
  const fps = m.med ? 1000 / m.med : 0;
  const prof = { name: p.name, loadMs, fcpMs: Math.round(m.paintFcp), fpsMedian: +fps.toFixed(1), frameP95Ms: +m.p95.toFixed(1), frameMaxMs: +m.max.toFixed(1), longTasks: m.longTasks,
    heapMB: +(m.heap / 1e6).toFixed(1), heapGrowthMB: +((m.heap - heapStart) / 1e6).toFixed(1), consoleErrors: errs, failedRequests: failed, externalRequests: [...new Set(external)],
    reactedToInput: reacted, horizontalScroll: m.hScroll, canvasFill: m.hasCanvas ? +(Math.max(m.canvasW / m.iw, m.canvasH / m.ih)).toFixed(2) : null };
  report.profiles.push(prof);
  const F = s => report.failures.push(`[${p.name}] ${s}`), W = s => report.warnings.push(`[${p.name}] ${s}`);
  if (errs.length) F(`${errs.length} console/page error(s): ${errs[0]}`);
  if (failed.length) F(`failed requests: ${failed.slice(0, 2).join(', ')}`);
  if (mockSdk) { prof.sdkCalls = sdkLog.length; const cnt = n => sdkLog.filter(x => x === n).length;
    if (!sdkLog.length) F(`mock ${mockSdk} SDK loaded no calls (SDK script tag missing in index.html, or adapter not wired)`);
    for (let i = 1; i < sdkLog.length; i++) if (sdkLog[i] === sdkLog[i - 1] && /^gameplay(Start|Stop)$/.test(sdkLog[i])) { F(`duplicate consecutive ${sdkLog[i]} (portals reject this)`); break; }
    const ord = sdkLog.filter(x => /^gameplay(Start|Stop)$/.test(x)); if (ord[0] === 'gameplayStop') F('gameplayStop fired before any gameplayStart');
    if (mockSdk === 'poki') { if (cnt('gameLoadingFinished') !== 1) F(`gameLoadingFinished called ${cnt('gameLoadingFinished')}x (expected 1)`); if (!cnt('gameplayStart')) F('gameplayStart never fired after player input'); if (sdkLog.indexOf('init') > sdkLog.indexOf('gameplayStart') && cnt('gameplayStart')) F('gameplayStart before PokiSDK.init'); }
    if (mockSdk === 'crazygames') { if (!cnt('gameplayStart')) F('gameplayStart never fired after player input'); if (!cnt('init')) F('SDK.init never called'); }
    if (mockSdk === 'youtube') { if (cnt('firstFrameReady') !== 1) F(`firstFrameReady called ${cnt('firstFrameReady')}x (expected 1)`); if (cnt('gameReady') !== 1) F(`gameReady called ${cnt('gameReady')}x (expected 1)`); if (sdkLog.indexOf('firstFrameReady') > sdkLog.indexOf('gameReady')) F('gameReady before firstFrameReady'); }
    if (p.name === 'desktop') report.sdkLog = sdkLog.slice(0, 60); }
  if (prof.externalRequests.length) W(`external requests (portals usually forbid): ${prof.externalRequests.slice(0, 3).join(', ')}`);
  if (m.n < 10) F('no animation frames sampled (page frozen?)');
  else if (cpu === 1 && fps < minFps) F(`median fps ${prof.fpsMedian} < ${minFps}`);
  if (cpu > 1 && m.p95 > 33) W(`p95 frame ${prof.frameP95Ms} ms under ${cpu}x CPU throttle`);
  if (cpu === 1 && m.p95 > 25) W(`p95 frame ${prof.frameP95Ms} ms > 25 ms`);
  if (!reacted) W('screen did not visibly change after input (game may need a different start action, or input is broken)');
  if (m.nan.count) F(`canvas got ${m.nan.count} non-finite value(s), first: ${m.nan.first} (NaN/Infinity in render math; usually a typo'd config key)`);
  if (m.hScroll) F('horizontal scroll present');
  if (m.hasCanvas && prof.canvasFill < 0.85) W(`canvas fills only ${Math.round(prof.canvasFill * 100)}% of viewport`);
  if (loadMs > 5000) W(`load took ${loadMs} ms`);
  if (perf && prof.heapGrowthMB > 50) W(`heap grew ${prof.heapGrowthMB} MB in ${seconds}s`);
  await ctx.close();
}
await browser.close(); server?.close();
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));

console.log(`\nPlaytest: ${url}`);
console.table(report.profiles.map(({ consoleErrors, failedRequests, externalRequests, ...r }) => r));
for (const w of report.warnings) console.log('WARN ', w);
for (const f of report.failures) console.log('FAIL ', f);
console.log(report.failures.length ? `\nRESULT: FAIL (${report.failures.length}) - report: ${outDir}/report.json` : `\nRESULT: PASS (${report.warnings.length} warning(s)) - screenshots in ${outDir}/`);
process.exit(report.failures.length ? 1 : 0);
