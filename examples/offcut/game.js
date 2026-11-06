// OFF-CUT: tap to drop the sliding slab. Whatever overhangs gets trimmed. Perfect drops keep your width.
// Art direction: risograph two-ink print (fluorescent pink + teal on cream), halftone shading, misregistration.
(() => {
'use strict';
const CFG = { W: 720, H: 1280, GROUND: 1130, bh: 56, baseW: 320, speed0: 330, speedStep: 13, speedMax: 880,
  perfectPx: 9, growEvery: 4, growPx: 20,
  feel: { hitStop: { cut: 40, perfect: 65, over: 170 }, shakeDecay: 1.8, shakeMax: 18, squashMs: 220,
    particles: { cut: 10, perfect: 26, over: 44 }, pitchJitter: 0.05 } };
const T = { paper: '#f1e6cf', ink: '#1b2b3c', pink: '#ff4fa0', teal: '#00a6a6', gold: '#ffc83d' };
const Q = new URLSearchParams(location.search);
const BOT = Q.has('bot') || Q.has('clip');
let seed = Q.has('seed') ? +Q.get('seed') : (Date.now() & 0x7fffffff);
const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
// Portal adapter (injected as platform.js by scripts/build-portal.mjs). Falls back to no-ops so the game also runs standalone.
const NOOP = { init: () => Promise.resolve(), loadingDone() {}, gameplayStart() {}, gameplayStop() {}, breakBetween: () => Promise.resolve(), submitScore() {}, onPauseRequest() {}, onAudioChange() {},
  saveGet(k) { try { return localStorage.getItem(k); } catch { return null; } }, saveSet(k, v) { try { localStorage.setItem(k, v); } catch {} } };
const platform = Object.assign({}, NOOP, window.__PLATFORM__ || {});
const store = { get: k => platform.saveGet(k), set: (k, v) => platform.saveSet(k, v) };

const cv = document.getElementById('c'), ctx = cv.getContext('2d');
let sc = 1, ox = 0, oy = 0, dpr = 1;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr);
  sc = Math.min(innerWidth / CFG.W, innerHeight / CFG.H); ox = (innerWidth - CFG.W * sc) / 2; oy = (innerHeight - CFG.H * sc) / 2;
}
addEventListener('resize', resize); resize();

// ---------- pre-rendered textures ----------
function tile(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d')); return c; }
const grain = tile(256, 256, g => { const d = g.createImageData(256, 256); for (let i = 0; i < d.data.length; i += 4) { const v = rnd() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 22; } g.putImageData(d, 0, 0); });
const dotsFor = col => ctx.createPattern(tile(12, 12, g => { g.fillStyle = col; g.beginPath(); g.arc(6, 6, 3, 0, 7); g.fill(); }), 'repeat');
const DOTS = [dotsFor(T.ink), dotsFor(T.ink)];   // ink dots over the spot color = halftone shadow
const grainPat = ctx.createPattern(grain, 'repeat');

// ---------- audio (procedural) ----------
let ac = null, master = null, muted = store.get('offcut.mute') === '1', portalMute = false, adMute = false, adBusy = false;
const applyGain = () => { if (master) master.gain.value = (muted || portalMute || adMute) ? 0 : 0.6; };
function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); const comp = ac.createDynamicsCompressor(); master = ac.createGain(); master.gain.value = (muted || portalMute || adMute) ? 0 : 0.6; master.connect(comp); comp.connect(ac.destination); } catch {} } if (ac && ac.state === 'suspended') ac.resume(); }
function tone(f, d, type = 'sine', v = 0.25, slide = 0, delay = 0) { if (!ac || muted) return; const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f * (1 + (rnd() - .5) * CFG.feel.pitchJitter), t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d); o.connect(g); g.connect(master); o.start(t); o.stop(t + d + .02); }
function noise(d, v = 0.2, hp = 1200) { if (!ac || muted) return; const t = ac.currentTime, n = Math.floor(ac.sampleRate * d), b = ac.createBuffer(1, n, ac.sampleRate), a = b.getChannelData(0);
  for (let i = 0; i < n; i++) a[i] = (rnd() * 2 - 1) * (1 - i / n); const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  f.type = 'highpass'; f.frequency.value = hp; g.gain.value = v; s.buffer = b; s.connect(f); f.connect(g); g.connect(master); s.start(t); }
const PENT = [0, 2, 4, 7, 9];
const semi = c => PENT[c % 5] + 12 * Math.floor(c / 5);
const hz = s => 262 * Math.pow(2, Math.min(s, 28) / 12);
const sfx = {
  land() { tone(88, .14, 'sine', .4, .5); noise(.05, .08, 2500); },
  perfect(c) { const f = hz(semi(c)); tone(f, .35, 'triangle', .28); tone(f * 2, .5, 'sine', .14, 1, .04); tone(f * 3, .25, 'sine', .07, 1, .08); },
  cut() { noise(.14, .22, 900); tone(150, .16, 'square', .12, .5); },
  over() { noise(.5, .3, 400); tone(220, .6, 'sawtooth', .16, .25); tone(110, .7, 'sine', .3, .4, .05); },
  tick() { tone(1200, .03, 'square', .05); },
};

// ---------- state ----------
let RM = store.get('offcut.rm') != null ? store.get('offcut.rm') === '1' : !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const setRM = v => { RM = v; store.set('offcut.rm', v ? '1' : '0'); };
let st = 'menu', blocks, cur, debris = [], parts = [], rings = [], pops = [];
let score = 0, combo = 0, best = +store.get('offcut.best') || 0, trauma = 0, freeze = 0, cam = 0, camT = 0, tm = 0, squash = 0, overT = 0, paused = false, flash = 0, bot = {};
const base = () => ({ x: (CFG.W - CFG.baseW) / 2, w: CFG.baseW, c: 0 });
const speed = () => Math.min(CFG.speedMax, CFG.speed0 + blocks.length * CFG.speedStep);
const levelY = i => CFG.GROUND - (i + 1) * CFG.bh;           // top of block i, before camera
function spawn() { const n = blocks.length, top = blocks[n - 1], dir = rnd() < .5 ? 1 : -1;
  cur = { w: top.w, dir, c: n % 2, x: dir > 0 ? 0 : CFG.W - top.w, px: 0 };
  bot = { off: rnd() < .4 ? 0 : (rnd() - .5) * 64 }; }
function reset() { blocks = [base()]; debris = []; parts = []; rings = []; pops = []; score = 0; combo = 0; cam = camT = 0; spawn(); st = 'play'; platform.gameplayStart(); }
blocks = [base()]; spawn();

function burst(x, y, n, cols, power = 1) { for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, s = (120 + rnd() * 420) * power;
  parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 160, life: .5 + rnd() * .5, max: 1, sz: 6 + rnd() * 12, r: rnd() * 6, vr: (rnd() - .5) * 14, col: cols[i % cols.length] }); } parts.forEach(p => p.max = p.life); }
function pop(text, x, y, col) { pops.push({ text, x, y, life: .9, col }); }

function drop() {
  const top = blocks[blocks.length - 1], dx = cur.x - top.x, y = levelY(blocks.length), cx = cur.x + cur.w / 2;
  const cols = [T.pink, T.teal, T.ink, T.gold];
  if (Math.abs(dx) <= CFG.perfectPx) {
    cur.x = top.x; combo++;
    if (combo % CFG.growEvery === 0 && cur.w < CFG.baseW) { const g = Math.min(CFG.growPx, CFG.baseW - cur.w); cur.w += g; cur.x = Math.max(0, Math.min(CFG.W - cur.w, cur.x - g / 2)); pop('WIDER!', CFG.W / 2, y - 60, T.gold); }
    blocks.push({ x: cur.x, w: cur.w, c: cur.c }); score++;
    sfx.land(); sfx.perfect(combo); trauma = Math.min(1, trauma + .3); freeze = CFG.feel.hitStop.perfect; squash = 1; flash = .5; if (RM) { trauma = 0; freeze = 0; squash = 0; flash = 0; }
    rings.push({ x: cx, y: y + CFG.bh, r: cur.w / 2, life: .5, col: cur.c ? T.pink : T.teal }); burst(cx, y + CFG.bh / 2, CFG.feel.particles.perfect, cols, 1.1);
    pop(combo > 1 ? 'PERFECT ×' + combo : 'PERFECT', cx, y - 20, cur.c ? T.pink : T.teal);
  } else {
    const l = Math.max(cur.x, top.x), r = Math.min(cur.x + cur.w, top.x + top.w), ov = r - l;
    if (ov <= 6) { // miss entirely
      debris.push({ x: cur.x, w: cur.w, wy: y, vy: 0, vx: cur.dir * 80, rot: 0, vr: cur.dir * .6, c: cur.c });
      return gameOver();
    }
    const oh = dx > 0 ? { x: r, w: cur.x + cur.w - r } : { x: cur.x, w: l - cur.x };
    debris.push({ x: oh.x, w: oh.w, wy: y, vy: 0, vx: (dx > 0 ? 1 : -1) * 120, rot: 0, vr: (dx > 0 ? 1 : -1) * 1.6, c: cur.c });
    blocks.push({ x: l, w: ov, c: cur.c }); score++; combo = 0;
    sfx.land(); sfx.cut(); trauma = Math.min(1, trauma + .45); freeze = CFG.feel.hitStop.cut; squash = .7; if (RM) { trauma = 0; freeze = 0; squash = 0; }
    burst(dx > 0 ? r : l, y + CFG.bh / 2, CFG.feel.particles.cut, [cur.c ? T.pink : T.teal, T.ink], .8);
  }
  camT = Math.max(0, (blocks.length - 7) * CFG.bh); spawn();
}
function gameOver() {
  st = 'over'; overT = tm; cur = null; trauma = 1; freeze = CFG.feel.hitStop.over; flash = 1; if (RM) { trauma = 0; freeze = 0; flash = 0; } sfx.over(); platform.gameplayStop(); platform.submitScore(score);
  burst(CFG.W / 2, levelY(blocks.length) + CFG.bh, CFG.feel.particles.over, [T.pink, T.teal, T.ink, T.gold], 1.4);
  if (score > best) { best = score; store.set('offcut.best', best); }
}
function setPaused(v) { if (v === paused) return; paused = v; if (v) platform.gameplayStop(); else if (st === 'play') platform.gameplayStart(); }
function retry() { if (adBusy) return; adBusy = true; Promise.resolve(platform.breakBetween(m => { adMute = m; applyGain(); })).catch(() => {}).then(() => { adMute = false; applyGain(); adBusy = false; reset(); }); }
function act() { audio(); if (adBusy) return;
  if (paused) { setPaused(false); return; }
  if (st === 'menu') reset(); else if (st === 'play') drop(); else if (st === 'over' && tm - overT > .5) retry(); }

// ---------- input ----------
cv.addEventListener('pointerdown', e => { e.preventDefault(); const r = cv.getBoundingClientRect(), x = (e.clientX - r.left - ox) / sc, y = (e.clientY - r.top - oy) / sc;
  if (st === 'menu' && y > 1190 && y < 1270) { setRM(!RM); sfx.tick(); return; }
  if (x > CFG.W - 110 && y < 110) { audio(); muted = !muted; store.set('offcut.mute', muted ? '1' : '0'); applyGain(); sfx.tick(); return; } act(); });
addEventListener('keydown', e => { if (e.repeat) return;
  if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowDown') { e.preventDefault(); act(); }
  else if (e.code === 'KeyP' || e.code === 'Escape') { if (st === 'play' && !adBusy) setPaused(!paused); }
  else if (e.code === 'KeyR') setRM(!RM);
  else if (e.code === 'KeyM') { muted = !muted; store.set('offcut.mute', muted ? '1' : '0'); applyGain(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (st === 'play') setPaused(true); ac && ac.suspend(); } else ac && !muted && ac.resume(); });
addEventListener('blur', () => { if (st === 'play') setPaused(true); });
if (Q.has('debug')) Object.defineProperty(window, '__game', { value: { get state() { return st; }, get score() { return score; } } });   // QA hook, only with ?debug
platform.onPauseRequest(p => { if (p && st === 'play') setPaused(true); });   // portal pauses; player taps to resume
platform.onAudioChange(en => { portalMute = !en; applyGain(); });

// ---------- update ----------
function step(dt) {
  tm += dt; if (adBusy) return;
  if (st === 'menu' || st === 'play') { // slider
    cur.px = cur.x; cur.x += cur.dir * speed() * dt * (st === 'menu' ? .6 : 1);
    if (cur.x <= 0) { cur.x = 0; cur.dir = 1; } else if (cur.x + cur.w >= CFG.W) { cur.x = CFG.W - cur.w; cur.dir = -1; }
    if (BOT) { // autoplay for clips / attract: drop when crossing a target offset from the stack top
      if (st === 'menu' && tm > .8) act();
      else if (st === 'play') { const tg = blocks[blocks.length - 1].x + bot.off; if ((cur.px - tg) * (cur.x - tg) <= 0 && cur.px !== cur.x) drop(); } }
  } else if (st === 'over' && BOT && tm - overT > 1.6) retry();
  cam += (camT - cam) * Math.min(1, dt * 6);
  trauma = Math.max(0, trauma - CFG.feel.shakeDecay * dt); squash = Math.max(0, squash - dt * 1000 / CFG.feel.squashMs); flash = Math.max(0, flash - dt * 4);
  for (const d of debris) { d.vy += 2600 * dt; d.wy += d.vy * dt; d.x += d.vx * dt; d.rot += d.vr * dt; } debris = debris.filter(d => d.wy + cam < CFG.H + 200);
  for (const p of parts) { p.vy += 1400 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; p.life -= dt; } parts = parts.filter(p => p.life > 0);
  for (const r of rings) { r.life -= dt; r.r += 520 * dt; } rings = rings.filter(r => r.life > 0);
  for (const p of pops) { p.life -= dt; p.y -= 70 * dt; } pops = pops.filter(p => p.life > 0);
}

// ---------- render ----------
const FONT = '"Bowlby One","Arial Black",system-ui,sans-serif';
function inkText(text, x, y, size, col, rot = 0, align = 'center', offs = 5) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.font = `400 ${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.fillStyle = T.ink; ctx.fillText(text, offs, offs); ctx.lineWidth = size * .09; ctx.strokeStyle = T.ink; ctx.strokeText(text, 0, 0); ctx.fillStyle = col; ctx.fillText(text, 0, 0); ctx.restore(); }
function slab(x, y, w, c, a = 1, sy = 1) { const h = CFG.bh, col = c ? T.pink : T.teal; ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y + h); ctx.scale(1, sy); ctx.translate(0, -h);
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = col; ctx.fillRect(3, -2, w, h);         // misregistered ink layer
  ctx.globalCompositeOperation = 'source-over'; ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip(); ctx.fillStyle = DOTS[c]; ctx.globalAlpha = a * .42; ctx.translate(0, h * .5); ctx.fillRect(0, 0, w, h); ctx.restore();
  ctx.globalAlpha = a; ctx.lineWidth = 5; ctx.strokeStyle = T.ink; ctx.strokeRect(0, 0, w, h); ctx.fillStyle = T.ink; ctx.fillRect(w - 10, 8, 4, h - 16); ctx.restore(); }

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = T.paper; ctx.fillRect(0, 0, cv.width, cv.height);
  const shk = trauma * trauma; const sx = Math.sin(tm * 91) * CFG.feel.shakeMax * shk, sy = Math.cos(tm * 77) * CFG.feel.shakeMax * shk, sr = Math.sin(tm * 63) * .02 * shk;
  ctx.setTransform(dpr * sc, 0, 0, dpr * sc, (ox + sx * sc) * dpr, (oy + sy * sc) * dpr); ctx.rotate(sr);
  // backdrop: big ghost score + sun disc
  ctx.fillStyle = T.pink; ctx.globalAlpha = .12; ctx.beginPath(); ctx.arc(CFG.W * .78, 280 + cam * .12, 190, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  ctx.save(); ctx.globalAlpha = .1; ctx.font = `400 440px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = score % 2 ? T.pink : T.teal; ctx.fillText(String(score), CFG.W / 2 - 10, 720 + cam * .1 + 12 * Math.sin(tm)); ctx.restore();
  // ground
  const gy = CFG.GROUND + cam; ctx.fillStyle = T.ink; ctx.fillRect(-2000, gy, CFG.W + 4000, 4000); ctx.fillStyle = T.paper; for (let x = -1996; x < CFG.W + 2000; x += 36) ctx.fillRect(x, gy + 22, 18, 6);
  // wide screens: halftone the margins and mark the play-field edges
  if (ox > 2) { ctx.save(); ctx.globalAlpha = .13; ctx.fillStyle = DOTS[0]; ctx.fillRect(-3000, -4000, 3000, 9000); ctx.fillRect(CFG.W, -4000, 3000, 9000); ctx.restore(); ctx.fillStyle = T.ink; ctx.fillRect(-6, -4000, 6, 9000); ctx.fillRect(CFG.W, -4000, 6, 9000); }
  // blocks
  const n = blocks.length;
  blocks.forEach((b, i) => { const top = i === n - 1; slab(b.x, levelY(i) + cam, b.w, b.c, 1, top && squash > 0 ? 1 - .22 * squash : 1); });
  if (cur) slab(cur.x, levelY(n) + cam, cur.w, cur.c);
  for (const d of debris) { ctx.save(); ctx.translate(d.x + d.w / 2, d.wy + cam + CFG.bh / 2); ctx.rotate(d.rot); ctx.translate(-d.w / 2, -CFG.bh / 2); slab(0, 0, d.w, d.c, .95); ctx.restore(); }
  for (const r of rings) { ctx.globalAlpha = Math.max(0, r.life * 1.6); ctx.lineWidth = 7; ctx.strokeStyle = r.col; ctx.beginPath(); ctx.ellipse(r.x, r.y + cam, r.r, r.r * .25, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
  for (const p of parts) { ctx.save(); ctx.globalAlpha = Math.min(1, p.life / p.max * 1.5); ctx.translate(p.x, p.y + cam); ctx.rotate(p.r); ctx.fillStyle = p.col; ctx.fillRect(-p.sz / 2, -p.sz / 3, p.sz, p.sz * .66); ctx.restore(); }
  for (const p of pops) { ctx.globalAlpha = Math.min(1, p.life * 2); inkText(p.text, p.x, p.y + cam, 54, p.col, -.04, 'center', 4); ctx.globalAlpha = 1; }
  // paper grain + flash
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = grainPat; ctx.fillRect(0, 0, cv.width, cv.height); if (flash > 0) { ctx.globalAlpha = flash * .35; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); } ctx.restore();
  // HUD
  ctx.setTransform(dpr * sc, 0, 0, dpr * sc, ox * dpr, oy * dpr);
  if (st !== 'menu') { const s = 1 + (combo > 0 && !RM ? .06 * Math.sin(tm * 18) : 0); ctx.save(); ctx.translate(CFG.W / 2, 130); ctx.scale(s, s); inkText(String(score), 0, 0, 200, T.paper, 0, 'center', 9); ctx.restore();
    if (best) inkText('BEST ' + best, 40, 60, 28, T.gold, 0, 'left', 3); }
  ctx.fillStyle = T.ink; ctx.beginPath(); ctx.moveTo(CFG.W - 84, 52); ctx.lineTo(CFG.W - 62, 52); ctx.lineTo(CFG.W - 44, 36); ctx.lineTo(CFG.W - 44, 84); ctx.lineTo(CFG.W - 62, 68); ctx.lineTo(CFG.W - 84, 68); ctx.fill();   // speaker
  ctx.strokeStyle = muted ? T.pink : T.ink; ctx.lineWidth = 6; ctx.beginPath(); if (muted) { ctx.moveTo(CFG.W - 30, 44); ctx.lineTo(CFG.W - 8, 76); ctx.moveTo(CFG.W - 8, 44); ctx.lineTo(CFG.W - 30, 76); } else { ctx.arc(CFG.W - 44, 60, 22, -.9, .9); } ctx.stroke();
  if (st === 'menu') { inkText('OFF-CUT', CFG.W / 2, 330, 124, T.pink, -.07, 'center', 9); inkText('TAP. TRIM.', CFG.W / 2, 470, 50, T.teal, -.07, 'center', 5); inkText("DON'T MISS.", CFG.W / 2, 530, 50, T.teal, -.07, 'center', 5);
    const pulse = 1 + .05 * Math.sin(tm * 6); ctx.save(); ctx.translate(CFG.W / 2, 760); ctx.scale(pulse, pulse); inkText('TAP TO START', 0, 0, 44, T.paper, 0, 'center', 5); ctx.restore(); if (best) inkText('BEST ' + best, CFG.W / 2, 840, 36, T.gold, 0, 'center', 4);
    ctx.save(); ctx.globalAlpha = .9; ctx.font = `400 30px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = T.paper; ctx.fillText('MOTION: ' + (RM ? 'REDUCED' : 'FULL') + '  [R]', CFG.W / 2, 1230); ctx.restore(); }
  if (st === 'over') { ctx.fillStyle = T.paper; ctx.globalAlpha = .82; ctx.fillRect(0, 300, CFG.W, 380); ctx.globalAlpha = 1; ctx.fillStyle = T.ink; ctx.fillRect(0, 300, CFG.W, 8); ctx.fillRect(0, 672, CFG.W, 8);
    inkText('TOPPLED', CFG.W / 2, 400, 100, T.pink, -.05, 'center', 8); inkText(score + (score === best && score > 0 ? '  NEW BEST' : '   BEST ' + best), CFG.W / 2, 520, 42, T.ink, 0, 'center', 0);
    if (tm - overT > .5) inkText('TAP TO RETRY', CFG.W / 2, 610, 38, T.teal, 0, 'center', 4); }
  if (paused) { ctx.fillStyle = T.ink; ctx.globalAlpha = .6; ctx.fillRect(0, 0, CFG.W, CFG.H); ctx.globalAlpha = 1; inkText('PAUSED', CFG.W / 2, 560, 100, T.paper, 0, 'center', 8); inkText('TAP TO RESUME', CFG.W / 2, 680, 36, T.gold, 0, 'center', 4); }
}

// ---------- fixed-timestep loop ----------
let last = performance.now(), acc = 0; const DT = 1 / 60;
function frame(now) { acc += Math.min((now - last) / 1000, .1); last = now;
  while (acc >= DT) { if (paused) { acc = 0; break; } if (freeze > 0) freeze -= 1000 * DT; else step(DT); acc -= DT; }
  render(); requestAnimationFrame(frame); }
const fontReady = (document.fonts && document.fonts.load) ? Promise.race([document.fonts.load('40px "Bowlby One"'), new Promise(r => setTimeout(r, 1500))]) : Promise.resolve();
Promise.all([Promise.resolve(platform.init()).catch(() => {}), fontReady]).then(() => { last = performance.now(); requestAnimationFrame(frame); requestAnimationFrame(() => platform.loadingDone()); });   // loadingDone after the first frame is on screen
})();
