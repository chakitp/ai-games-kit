#!/usr/bin/env node
// AI Games Kit: portal bundle auditor. Zero dependencies.
// Usage: node scripts/audit-bundle.mjs <dir> [--portal poki|crazygames|youtube|itch|gd|all] [--json]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const MiB = 1024 * 1024, MB = 1e6;
const args = process.argv.slice(2);
const dir = args.find(a => !a.startsWith('--'));
const flag = n => { const i = args.indexOf('--' + n); return i < 0 ? null : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
if (!dir || !fs.existsSync(dir)) { console.error('Usage: audit-bundle.mjs <dir> [--portal ...] [--json]'); process.exit(2); }
const portals = (flag('portal') && flag('portal') !== true ? flag('portal') : 'all').split(',');

// Limits verified 2026-11-05 (see skills/portal-export/references). MUST => FAIL, SHOULD => WARN.
const LIMITS = {
  poki:        { initialWarn: 8 * MB, noExternal: true,  note: 'initial <8 MB target; no external requests' },
  crazygames:  { initialFail: 50 * MB, initialWarn: 20 * MB, totalFail: 250 * MB, filesFail: 1500, noAbsolute: true, note: 'initial <=50 MB (<=20 MB mobile homepage)' },
  youtube:     { initialFail: 30 * MiB, initialWarn: 15 * MiB, totalFail: 250 * MiB, fileFail: 30 * MiB, fileWarn: 512 * 1024, filesFail: 8000, nameRule: /^[A-Za-z0-9_.\-]+$/, noAbsolute: true, noExternal: true, note: 'initial <30 MiB (should <15), file <30 MiB (should <512 KiB)' },
  itch:        { totalFail: 500 * MB, fileFail: 200 * MB, filesFail: 1000, note: '500 MB extracted, 200 MB/file, 1000 files' },
  gd:          { initialWarn: 8 * MB, note: 'no published cap; use Poki budget' },
};
const ALLOWED_HOSTS = {
  poki: ['poki.com', 'poki-gdn.com'], crazygames: ['crazygames.com'], youtube: ['youtube.com', 'gstatic.com'],
  itch: [], gd: ['gamedistribution.com'],
};

function walk(d, base = d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === '_submission' || e.name === '.DS_Store' || e.name === 'node_modules') continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, base, out); else out.push({ rel: path.relative(base, p).split(path.sep).join('/'), size: fs.statSync(p).size, abs: p });
  }
  return out;
}
const files = walk(dir);
const total = files.reduce((s, f) => s + f.size, 0);
const fmt = n => n >= MiB ? (n / MiB).toFixed(2) + ' MiB' : (n / 1024).toFixed(1) + ' KiB';
const fmtL = n => (n % MB === 0 && n % MiB !== 0) ? (n / MB) + ' MB' : fmt(n); // limits as the portal states them

// Estimate initial bundle: index.html + statically referenced local assets (script/link/img/source, CSS url()).
// Lower bound: dynamic imports/fetches after load are not followed.
const initial = new Set(); const issues = [];
const idx = files.find(f => f.rel === 'index.html');
if (!idx) issues.push(['ALL', 'FAIL', 'index.html missing at bundle root']);
function addRef(ref, from) {
  if (!ref || /^(data:|#|mailto:)/.test(ref)) return;
  if (/^https?:\/\/|^\/\//.test(ref)) { externals.add(ref + `  (in ${from})`); return; }
  const clean = ref.split(/[?#]/)[0];
  if (clean.startsWith('/')) { absolutes.add(`${from} -> ${ref}`); return; }
  const rel = path.posix.normalize(path.posix.join(path.posix.dirname(from), clean));
  const f = files.find(x => x.rel === rel);
  if (f && !initial.has(f.rel)) { initial.add(f.rel); scan(f); }
}
const externals = new Set(), absolutes = new Set(), debugHits = [];
function scan(f) {
  if (!/\.(html?|css|js|mjs)$/i.test(f.rel)) return;
  const txt = fs.readFileSync(f.abs, 'utf8');
  if (/\.html?$/i.test(f.rel)) for (const m of txt.matchAll(/(?:src|href|poster|data-src)\s*=\s*["']([^"']+)["']/gi)) addRef(m[1], f.rel);
  if (/\.css$/i.test(f.rel) || /\.html?$/i.test(f.rel)) for (const m of txt.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) addRef(m[1], f.rel);
  if (/\.(m?js|html?)$/i.test(f.rel)) {
    // URLs inside JS comments are not requests: strip block comments and // line comments (but keep '://' and quoted '//cdn...').
    const code = /\.m?js$/i.test(f.rel) ? txt.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'`\\])\/\/[^\n]*/g, '$1') : txt;
    for (const m of code.matchAll(/https?:\/\/[^\s"'`)<>\\]+/g)) { if (!/w3\.org|schema\.org|xmlns/.test(m[0])) externals.add(m[0] + `  (in ${f.rel})`); }
    if (/\bdebugger\b/.test(txt)) debugHits.push(`${f.rel}: debugger statement`);
    if (/localhost|127\.0\.0\.1/.test(txt)) debugHits.push(`${f.rel}: localhost reference`);
    if (/sourceMappingURL=/.test(txt)) debugHits.push(`${f.rel}: sourcemap reference`);
  }
}
if (idx) { initial.add('index.html'); scan(idx); }
for (const f of files) if (/\.(m?js)$/i.test(f.rel) && !initial.has(f.rel)) scan(f); // scan all JS for externals/debug, not counted as initial
const initialFiles = files.filter(f => initial.has(f.rel));
const initialRaw = initialFiles.reduce((s, f) => s + f.size, 0);
const gz = initialFiles.reduce((s, f) => s + (/\.(html?|css|m?js|json|svg|wasm|txt)$/i.test(f.rel) ? zlib.gzipSync(fs.readFileSync(f.abs)).length : f.size), 0);
const initialEst = gz; // transfer size estimate

const results = {};
for (const p of (portals.includes('all') ? Object.keys(LIMITS) : portals)) {
  const L = LIMITS[p]; if (!L) { console.error('Unknown portal ' + p); process.exit(2); }
  const r = []; const add = (lvl, msg) => r.push([lvl, msg]);
  if (!idx) add('FAIL', 'index.html missing at bundle root');
  if (L.initialFail && initialEst > L.initialFail) add('FAIL', `initial ~${fmt(initialEst)} > ${fmtL(L.initialFail)}`);
  else if (L.initialWarn && initialEst > L.initialWarn) add('WARN', `initial ~${fmt(initialEst)} > ${fmtL(L.initialWarn)} target`);
  if (L.totalFail && total > L.totalFail) add('FAIL', `total ${fmt(total)} > ${fmtL(L.totalFail)}`);
  if (L.filesFail && files.length > L.filesFail) add('FAIL', `${files.length} files > ${L.filesFail}`);
  if (L.fileFail) for (const f of files) if (f.size >= L.fileFail) add('FAIL', `${f.rel} ${fmt(f.size)} >= ${fmtL(L.fileFail)}`);
  if (L.fileWarn) { const big = files.filter(f => f.size > L.fileWarn); if (big.length) add('WARN', `${big.length} file(s) > ${fmtL(L.fileWarn)} (recommended); largest: ${big.sort((a, b) => b.size - a.size).slice(0, 3).map(f => f.rel + ' ' + fmt(f.size)).join(', ')}`); }
  if (L.nameRule) for (const f of files) for (const seg of f.rel.split('/')) if (!L.nameRule.test(seg)) { add('FAIL', `illegal filename chars: ${f.rel}`); break; }
  if (L.noAbsolute && absolutes.size) add('FAIL', `absolute paths: ${[...absolutes].slice(0, 3).join('; ')}`);
  if (L.noExternal) {
    const bad = [...externals].filter(u => !(ALLOWED_HOSTS[p] || []).some(h => u.includes(h)));
    if (bad.length) add(p === 'poki' || p === 'youtube' ? 'FAIL' : 'WARN', `external URLs (${bad.length}): ${bad.slice(0, 4).join('; ')}`);
  }
  if (debugHits.length) add('WARN', 'debug leftovers: ' + debugHits.slice(0, 4).join('; '));
  if (!r.some(x => x[0] === 'FAIL')) add('PASS', L.note);
  results[p] = r;
}

if (flag('json')) { console.log(JSON.stringify({ dir, files: files.length, total, initialEst, initialRaw, results }, null, 2)); }
else {
  console.log(`\nBundle: ${dir}\nFiles: ${files.length} | Total: ${fmt(total)} | Initial (est. gzip, static refs only): ${fmt(initialEst)} (raw ${fmt(initialRaw)})`);
  console.log('Largest: ' + [...files].sort((a, b) => b.size - a.size).slice(0, 5).map(f => `${f.rel} ${fmt(f.size)}`).join(', '));
  for (const [p, r] of Object.entries(results)) { console.log(`\n[${p}]`); for (const [l, m] of r) console.log(`  ${l.padEnd(4)} ${m}`); }
  console.log('\nNote: initial size is a lower-bound estimate. Confirm with the portal\'s own tool (YouTube bundle analyzer, CrazyGames QA).');
}
process.exit(Object.values(results).some(r => r.some(x => x[0] === 'FAIL')) ? 1 : 0);
