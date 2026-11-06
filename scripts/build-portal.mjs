#!/usr/bin/env node
// AI Games Kit: build a portal-specific bundle from a plain static game folder. Zero dependencies.
// Usage: node scripts/build-portal.mjs <gameDir> --portal poki|crazygames|youtube|itch|all [--out dist] [--no-zip]
// What it does: copies the game (minus docs/marketing/maps/dotfiles), writes the matching adapter to platform.js,
// injects the portal SDK <script> (if any) + platform.js BEFORE the game's first <script>, writes _submission/ notes, zips.
// Requirement on the game: call window.__PLATFORM__ (adapter contract in skills/web-game-architecture) instead of any SDK.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const kit = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const VALUE = ['--portal', '--out'];
const src = path.resolve(args.find((a, i) => !a.startsWith('--') && !VALUE.includes(args[i - 1])) || '.');
const opt = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const outRoot = path.resolve(opt('out', 'dist'));
const wanted = String(opt('portal', 'all')).split(',');

// SDK script URLs: re-verify in each portal's docs before shipping (see skills/portal-export/references).
const PORTALS = {
  poki: { sdk: 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js', todo: [
    'Create/sign in to a Poki for Developers account: https://developers.poki.com/',
    'Upload the zip (or playable link) and fill pitch, controls, thumbnails (static + animated).',
    'Confirm web exclusivity and that no purchase UI/external links/debug code remain.',
    'Re-check https://sdk.poki.com/new-requirements for changes; wait for feedback rounds.'] },
  crazygames: { sdk: 'https://sdk.crazygames.com/crazygames-sdk-v3.js', todo: [
    'Sign in at the CrazyGames developer portal and upload the zip (index.html at root).',
    'Choose orientation, fill title/description/tags, upload portrait + landscape covers.',
    'Start with Basic Launch (no ads); apply for Full Launch once SDK events verified.',
    'Re-check https://docs.crazygames.com/requirements/technical.'] },
  youtube: { sdk: 'https://www.youtube.com/game_api/v1', todo: [
    'YouTube Playables is invitation-based: use the Playables developer portal you were granted access to.',
    'Run the official bundle analyzer/test suite on the zip; fix anything it flags.',
    'Prepare 1:1 and 16:9 thumbnails, short description, privacy statement per the portal form.',
    'Re-check https://developers.google.com/youtube/gaming/playables/certification/requirements_stability.'] },
  itch: { sdk: null, todo: [
    'Create a new itch.io project: Kind = HTML, upload the zip, tick "played in the browser".',
    'Set viewport size (e.g. 720x1280 portrait or 960x540), enable fullscreen button.',
    'Add cover (630x500), screenshots, tags; link your short-form videos here as the canonical page.'] },
};

if (!fs.existsSync(path.join(src, 'index.html'))) { console.error(`No index.html in ${src}`); process.exit(2); }
const EXCLUDE = /(^|\/)(README\.md|LICENSE.*|marketing|docs|node_modules|dist|\.aigk|\.git|\.DS_Store|.*\.map|.*\.md)$/i;
// Kit tooling and project config at the game root are never shipped. A game's OWN scripts/ or platforms/ folder is kept
// (we only skip them when they are the kit's: build-portal.mjs / poki.js present).
const isTooling = n => (n === 'scripts' && fs.existsSync(path.join(src, 'scripts', 'build-portal.mjs')))
  || (n === 'platforms' && fs.existsSync(path.join(src, 'platforms', 'poki.js')))
  || /^(package(-lock)?\.json|tsconfig.*\.json|vite\.config\..*|pnpm-lock\.yaml|yarn\.lock|examples|templates|tests?|\.aigk)$/i.test(n);
const copyDir = (from, to, rel = '') => { fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) { const r = path.posix.join(rel, e.name);
    if (e.name.startsWith('.') || (EXCLUDE.test(r) && !/LICENSES?\.md$/i.test(e.name))) continue;
    if (!rel && isTooling(e.name)) continue;
    const a = path.join(from, e.name), b = path.join(to, e.name);
    e.isDirectory() ? copyDir(a, b, r) : fs.copyFileSync(a, b); } };

const list = wanted.includes('all') ? Object.keys(PORTALS) : wanted;
const summary = [];
for (const p of list) {
  const cfg = PORTALS[p]; if (!cfg) { console.error('Unknown portal ' + p); process.exit(2); }
  const out = path.join(outRoot, p);
  fs.rmSync(out, { recursive: true, force: true }); copyDir(src, out);
  const adapter = path.join(kit, 'platforms', p + '.js');
  if (!fs.existsSync(adapter)) { console.error('Missing adapter ' + adapter); process.exit(2); }
  fs.copyFileSync(adapter, path.join(out, 'platform.js'));
  // inject SDK + adapter before the first <script ...> tag (so the game can use window.__PLATFORM__ at load)
  let html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  html = html.replace(/<script[^>]*data-aigk[^>]*><\/script>\s*/g, '');
  const tags = (cfg.sdk ? `<script src="${cfg.sdk}" data-aigk></script>\n` : '') + `<script src="platform.js" data-aigk></script>\n`;
  const i = html.search(/<script\b/i);
  html = i >= 0 ? html.slice(0, i) + tags + html.slice(i) : html.replace(/<\/body>/i, tags + '</body>');
  fs.writeFileSync(path.join(out, 'index.html'), html);
  // submission notes (kept out of the zip)
  const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || 'Untitled';
  const sub = path.join(out, '_submission'); fs.mkdirSync(sub, { recursive: true });
  fs.writeFileSync(path.join(sub, 'TODO-human.md'), `# ${title}: ${p} submission steps (human)\n\n${cfg.todo.map(t => '- [ ] ' + t).join('\n')}\n`);
  fs.writeFileSync(path.join(sub, 'listing.md'), `# Listing draft: ${title} (${p})\n\n- Title (<=30 chars): ${title.slice(0, 30)}\n- One-line hook: \n- Description (2-3 sentences): \n- Controls: \n- Tags: \n- Age/content notes: \n- Thumbnails needed: see portal form (static + animated where asked)\n`);
  // zip (index.html at root, _submission excluded)
  let zipPath = null;
  if (!opt('no-zip', false)) { zipPath = path.join(outRoot, p + '.zip'); fs.rmSync(zipPath, { force: true });
    const z = spawnSync('zip', ['-qr', zipPath, '.', '-x', '_submission/*'], { cwd: out }); if (z.status !== 0) { zipPath = null; console.warn('zip not available; skipped zipping ' + p); } }
  summary.push({ portal: p, dir: path.relative(process.cwd(), out), zip: zipPath && path.relative(process.cwd(), zipPath), sdk: cfg.sdk || '(none)' });
}
console.table(summary);
console.log('Next: node scripts/audit-bundle.mjs <dir> --portal <p>  and  node scripts/playtest.mjs <dir> --mock-sdk <p>');
