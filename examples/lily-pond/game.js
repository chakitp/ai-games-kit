'use strict';
// LILY POND: hold to charge, release to leap. Sumi-e ink on paper, one vermilion accent. See docs/ for the locked decisions.
(() => {
const Q = new URLSearchParams(location.search);
const BOT = Q.has('bot') || Q.has('clip'), CLIP = Q.has('clip');
const NOOP = { init: () => Promise.resolve(), loadingDone() {}, gameplayStart() {}, gameplayStop() {}, breakBetween: () => Promise.resolve(), submitScore() {}, onPauseRequest() {}, onAudioChange() {},
  saveGet: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, saveSet: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
const platform = Object.assign({}, NOOP, window.__PLATFORM__ || {});
const store = { get: k => platform.saveGet(k), set: (k, v) => platform.saveSet(k, v) };

// ---- ALL tunables (docs/FEEL_TARGETS.md mirrors these) ----
const CFG = {
  pad: { r0: 120, rMin: 54, shrink: 3.4, gapMin: 270, gapMax: 430, luckyEvery: 10 },
  charge: { maxS: 0.9, minD: 130, maxD: 560 },
  perfect: 0.24,
  drift: { start: 8, base: 14, grow: 4, max: 70, speed: 1.3 },
  sinkStart: 18,
  feel: { hitStop: { perfect: .05, edge: .02, splash: .12 }, shakeMax: 10, shakeDecay: 1.6, squashCharge: [1.18, .78], squashLand: [1.3, .75], settle: .16, zoom: .035, zoomDecay: 4,
    parts: { perfect: 18, edge: 8, splash: 26, max: 240 }, pitchJit: .05, pent: [0, 2, 4, 7, 9], comboMax: 10 },
  C: { paper: '#efe6d2', ink: '#1d1b1a', wash: '#8a9a8e', pad: '#5f7a63', rim: '#3f5a45', red: '#c8321f', gold: '#b08d3c' },
};
const C = CFG.C, FONT = "'Shippori Mincho', 'Hiragino Mincho ProN', serif";

// ---- rng ----
let seed = Q.has('seed') ? (+Q.get('seed') || 1) >>> 0 : (Date.now() ^ 0x9e3779b9) >>> 0;
const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const rr = (a, b) => a + (b - a) * rnd(), lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const eOutCubic = t => 1 - Math.pow(1 - t, 3), eOutBack = t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

// ---- canvas / layout (logical units: 720 across in portrait, 720 tall in landscape; fills the screen, no letterbox) ----
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
let W = 720, H = 1280, sc = 1;
function resize() {
  const cw = innerWidth, ch = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
  if (cw >= ch) { H = 720; W = 720 * cw / ch; } else { W = 720; H = 720 * ch / cw; }
  cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); sc = cv.width / W;
}
addEventListener('resize', resize); resize();
const WATER = () => H * 0.56, ANCHOR = () => W * (W > H ? 0.28 : 0.3);

// ---- audio (procedural) ----
let ac = null, master = null, noiseBuf = null, muted = store.get('lily.mute') === '1', portalMute = false, adMute = false, chargeOsc = null, chargeGain = null;
const applyGain = () => { if (master) master.gain.value = (muted || portalMute || adMute) ? 0 : 0.7; };
function audio() {
  if (ac) { if (ac.state === 'suspended' && !muted) ac.resume(); return; }
  try { ac = new (window.AudioContext || window.webkitAudioContext)(); const comp = ac.createDynamicsCompressor(); master = ac.createGain(); master.connect(comp); comp.connect(ac.destination); applyGain();
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; } catch (e) { ac = null; }
}
const jit = () => 1 + (rnd() - .5) * 2 * CFG.feel.pitchJit;
function tone(f, d, v, type, slide) { if (!ac) return; const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f * jit(), t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + d); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .008); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + d + .05); }
function noise(d, v, fc, q) { if (!ac) return; const t = ac.currentTime, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = fc * jit(); f.Q.value = q || 1;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + d + .02); }
const bell = n => { const i = Math.min(n, CFG.feel.comboMax), p = CFG.feel.pent, f = 392 * Math.pow(2, (p[i % 5] + 12 * Math.floor(i / 5)) / 12); tone(f, .8, .2); tone(f * 2.76, .45, .06); tone(f * 4.1, .25, .03); };
const sfx = {
  leap() { noise(.2, .12, 900, .8); tone(300, .16, .08, 'sine', 1.9); },
  thock() { tone(190, .13, .26, 'triangle', .5); noise(.06, .15, 1500, 1.2); },
  perfect(n) { sfx.thock(); bell(n); },
  splash() { noise(.5, .32, 520, .6); tone(130, .4, .3, 'sine', .4); },
  tick() { tone(660, .05, .08, 'square'); },
  chargeStart() { if (!ac || chargeOsc) return; chargeOsc = ac.createOscillator(); chargeGain = ac.createGain(); chargeOsc.type = 'triangle'; chargeOsc.frequency.value = 180; chargeGain.gain.value = 0.0001; chargeOsc.connect(chargeGain); chargeGain.connect(master); chargeOsc.start(); },
  chargeSet(t) { if (!chargeOsc) return; chargeOsc.frequency.setTargetAtTime(180 + t * 420, ac.currentTime, .03); chargeGain.gain.setTargetAtTime(0.03 + t * 0.07, ac.currentTime, .03); },
  chargeStop() { if (!chargeOsc) return; const o = chargeOsc, g = chargeGain; chargeOsc = chargeGain = null; g.gain.setTargetAtTime(0.0001, ac.currentTime, .02); o.stop(ac.currentTime + .15); },
};

// ---- art: paper grain + vignette prerender ----
const grain = (() => { const g = document.createElement('canvas'); g.width = g.height = 256; const x = g.getContext('2d'), d = x.createImageData(256, 256);
  for (let i = 0; i < d.data.length; i += 4) { const v = rnd() < .5 ? 0 : 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = rnd() * 255 | 0; } x.putImageData(d, 0, 0); return ctx.createPattern(g, 'repeat'); })();
const washes = Array.from({ length: 16 }, () => ({ x: rr(0, 1400), y: rr(-.5, .5), w: rr(120, 380), h: rr(10, 34), a: rr(.12, .26), par: rr(.25, .6), ph: rr(0, 6.28) }));

// ---- game state ----
let st = 'menu', tm = 0, score = 0, combo = 0, best = +store.get('lily.best') || 0, perfects = 0, pads = [], f, holding = false, chargeT = 0, trauma = 0, freeze = 0, zoom = 0, camX = 0, overT = 0;
let paused = false, adBusy = false, scorePop = 0, flash = 0, parts = [], rings = [], pops = [], trail = [], bot = { off: 0, tgt: 0, wait: 0 };
let RM = store.get('lily.rm') === '1' || (matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const posOf = (p, t) => p.x0 + p.amp * Math.sin(CFG.drift.speed * t + p.ph);

function mkPad(n, prev) {
  const lucky = n > 0 && n % CFG.pad.luckyEvery === 0;
  let r = n === 0 ? 150 : Math.max(CFG.pad.rMin, CFG.pad.r0 - n * CFG.pad.shrink); if (lucky) r = Math.max(46, r * .62);
  const amp = n >= CFG.drift.start ? Math.min(CFG.drift.max, CFG.drift.base + (n - CFG.drift.start) * CFG.drift.grow) * rr(.6, 1) : 0;
  const pts = [], N = 30, notch = rr(0, 6.28); for (let i = 0; i < N; i++) { const a = i / N * 6.283; let d = Math.abs(((a - notch + 9.42) % 6.283) - 3.1416); pts.push([a, 1 + (rnd() - .5) * .08, Math.abs(a - notch) < .2 || Math.abs(a - notch - 6.283) < .2 || Math.abs(a - notch + 6.283) < .2]); }
  return { n, x0: n === 0 ? 0 : prev.x0 + rr(CFG.pad.gapMin, CFG.pad.gapMax), y: WATER() + (n === 0 ? 0 : rr(-60, 60)), r, amp, ph: rr(0, 6.28), lucky, pts, notch, sink: -1, veins: Array.from({ length: 5 }, () => rr(0, 6.28)) };
}
function fill(n) { while (pads.length < n + 8) pads.push(mkPad(pads.length, pads[pads.length - 1])); }
function reset(quiet) {
  pads = []; fill(0); score = 0; combo = 0; perfects = 0; parts = []; rings = []; pops = []; trail = []; trauma = 0; zoom = 0; chargeT = 0; flash = 0;
  f = { i: 0, ox: 0, mode: 'idle', sx: 0, sy: 0, tx: 0, ty: 0, u: 0, T: 0, h: 0, hit: null, sq: [1, 1], sqT: 0, idleT: 0, x: 0, y: 0 };
  camX = pads[0].x0 - ANCHOR(); if (quiet) { st = 'menu'; return; } st = 'play'; platform.gameplayStart();
}
reset(true);   // menu behind: the frog sits on the first pad; no portal gameplay calls until the first press

const distOf = t => CFG.charge.minD + t * (CFG.charge.maxD - CFG.charge.minD);
const flightT = d => .35 + d / 1100;
const rm = v => RM ? 0 : v;

function press() {
  audio(); if (adBusy) return;
  if (st === 'menu') { reset(); }
  else if (st === 'over') { if (tm - overT > .5) retry(); return; }
  holding = true;
}
function release() {
  if (!holding) return; holding = false; sfx.chargeStop();
  if (st !== 'play' || f.mode !== 'idle' || chargeT < 0.02) { chargeT = 0; return; }
  const t = clamp(chargeT / CFG.charge.maxS, 0, 1), dist = distOf(t), T = flightT(dist); chargeT = 0;
  const cur = pads[f.i], sx = posOf(cur, tm) + f.ox, tx = sx + dist, tl = tm + T;
  let hit = null; for (let k = f.i; k <= f.i + 2 && !hit; k++) { const p = pads[k], d = Math.abs(tx - posOf(p, tl)); if (d <= p.r * .95) hit = { k, d, perfect: d <= Math.max(14, p.r * CFG.perfect) }; }
  const tgt = pads[Math.min(f.i + 1, pads.length - 1)];
  f.mode = 'air'; f.sx = sx; f.sy = cur.y - 6; f.tx = tx; f.ty = (hit ? pads[hit.k] : tgt).y - 6; f.u = 0; f.T = T; f.h = 70 + dist * .26; f.hit = hit; f.sq = [CFG.feel.squashCharge[1] * .9 + .3, 1.15]; f.sqT = .12;
  if (cur.n >= CFG.sinkStart && hit && hit.k !== f.i) cur.sink = 0;   // the pad you leave starts to sink (visual only)
  sfx.leap();
}
function retry() { if (adBusy) return; adBusy = true; Promise.resolve(platform.breakBetween(m => { adMute = m; applyGain(); })).catch(() => {}).then(() => { adMute = false; applyGain(); adBusy = false; reset(); }); }
function setPaused(v) { if (v === paused) return; paused = v; if (v) { platform.gameplayStop(); sfx.chargeStop(); } else if (st === 'play') platform.gameplayStart(); }

function burst(x, y, n, col, spd, up) { for (let i = 0; i < n && parts.length < CFG.feel.parts.max; i++) { const a = rnd() * 6.283, s = rr(.3, 1) * spd; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * .6 - up * rnd(), l: 0, max: rr(.25, .55), r: rr(2.5, 6), col }); } }
function land() {
  const h = f.hit, p = pads[h.k], prev = f.i; f.mode = 'idle'; f.u = 1; f.i = h.k; f.ox = f.tx - posOf(p, tm); f.sq = CFG.feel.squashLand; f.sqT = CFG.feel.settle; f.idleT = 0; fill(f.i);
  const y = f.ty, x = f.tx;
  if (h.k === prev) { sfx.thock(); burst(x, y, 4, C.ink, 80, 50); return; }   // hopped in place: no score, no combo change
  if (h.perfect) { combo++; perfects++; const gain = (p.lucky ? 3 : 1) + Math.min(combo - 1, 5); score += gain; sfx.perfect(combo - 1); burst(x, y, CFG.feel.parts.perfect, C.ink, 220, 160); rings.push({ x, y, r: 8, l: 0, col: C.red }); pops.push({ t: combo > 1 ? 'PERFECT x' + combo : 'PERFECT', x, y: y - 80, l: 0, col: C.red });
    freeze = rm(CFG.feel.hitStop.perfect); zoom = rm(CFG.feel.zoom); trauma = Math.min(1, trauma + rm(.25)); if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) {} }
  else { combo = 0; score += p.lucky ? 3 : 1; sfx.thock(); burst(x, y, CFG.feel.parts.edge, C.ink, 130, 90); rings.push({ x, y, r: 8, l: 0, col: C.wash }); freeze = rm(CFG.feel.hitStop.edge); }
  scorePop = 1; platform.submitScore(score);
}
function splash() {
  const x = f.tx, y = f.ty + 8; f.mode = 'dead'; st = 'over'; overT = tm; combo = 0; sfx.splash(); burst(x, y, CFG.feel.parts.splash, C.wash, 260, 220); burst(x, y, 8, C.ink, 160, 120);
  rings.push({ x, y, r: 10, l: 0, col: C.ink }, { x, y, r: 4, l: -.12, col: C.wash }); freeze = rm(CFG.feel.hitStop.splash); trauma = rm(1); flash = rm(.5);
  if (score > best) { best = score; store.set('lily.best', String(best)); } platform.gameplayStop(); platform.submitScore(score);
}

// ---- bot (attract mode, QA soak, clip footage) ----
function botThink(dt) {
  if (st === 'menu') { if (tm > .8) press(); return; }
  if (st === 'over') { if (tm - overT > (CLIP ? .6 : 1.4) && !adBusy) retry(); return; }
  if (f.mode !== 'idle') return;
  if (!holding) { f.idleT += dt; if (f.idleT < .28) return;
    const p = pads[f.i + 1], sx = posOf(pads[f.i], tm) + f.ox; let d = p.x0 - sx; for (let k = 0; k < 4; k++) d = posOf(p, tm + flightT(d)) - sx;
    bot.off = rnd() < .5 ? 0 : (rnd() - .5) * 1.7 * p.r; if (rnd() < .05) bot.off = (rnd() < .5 ? -1 : 1) * p.r * 1.35;
    bot.tgt = clamp(((d + bot.off) - CFG.charge.minD) / (CFG.charge.maxD - CFG.charge.minD), 0, 1) * CFG.charge.maxS; holding = true; return; }
  if (chargeT >= bot.tgt) release();
}

// ---- update ----
function update(dt) {
  parts.forEach(p => { p.l += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 520 * dt; }); parts = parts.filter(p => p.l < p.max);
  rings.forEach(r => { r.l += dt; }); rings = rings.filter(r => r.l < .7); pops.forEach(p => { p.l += dt; }); pops = pops.filter(p => p.l < .9);
  trail.forEach(t => { t.l += dt; }); trail = trail.filter(t => t.l < .35);
  trauma = Math.max(0, trauma - CFG.feel.shakeDecay * dt); zoom = Math.max(0, zoom - CFG.feel.zoomDecay * zoom * dt - 0.001); scorePop = Math.max(0, scorePop - dt * 5); flash = Math.max(0, flash - dt * 3);
  if (paused) return;
  if (freeze > 0) { freeze -= dt; return; }
  tm += dt;
  if (BOT) botThink(dt);
  if (f.sqT > 0) { f.sqT -= dt; if (f.sqT <= 0) f.sq = [1, 1]; }
  if (st === 'play' && f.mode === 'idle') { f.idleT += dt; if (holding) { chargeT = Math.min(CFG.charge.maxS, chargeT + dt); if (!chargeOsc) sfx.chargeStart(); sfx.chargeSet(chargeT / CFG.charge.maxS); } }
  if (f.mode === 'air') { f.u = Math.min(1, f.u + dt / f.T); const ex = lerp(f.sx, f.tx, f.u), ey = lerp(f.sy, f.ty, f.u) - f.h * 4 * f.u * (1 - f.u); trail.push({ x: ex, y: ey, l: 0 });
    if (f.u >= 1) { f.hit ? land() : splash(); } }
  pads.forEach(p => { if (p.sink >= 0) p.sink += dt; });
  const fx = f.mode === 'idle' ? posOf(pads[f.i], tm) + f.ox : (f.mode === 'air' ? lerp(f.sx, f.tx, f.u) : f.tx);
  camX += ((fx - ANCHOR()) - camX) * Math.min(1, dt * 4.5);
}

// ---- draw ----
function ink(c) { ctx.strokeStyle = c || C.ink; ctx.lineJoin = ctx.lineCap = 'round'; }
function drawPad(p, tNow) {
  const x = posOf(p, tNow), sk = p.sink >= 0 ? clamp(p.sink / 1.2, 0, 1) : 0; if (sk >= 1) return;
  ctx.save(); ctx.translate(x, p.y + sk * 30); ctx.globalAlpha = 1 - sk;
  ctx.fillStyle = 'rgba(29,27,26,.12)'; ctx.beginPath(); ctx.ellipse(6, 12, p.r * 1.02, p.r * .44, 0, 0, 6.283); ctx.fill();
  const path = o => { ctx.beginPath(); let first = true; for (const [a, j, nt] of p.pts) { if (nt) { if (first) continue; } const px = Math.cos(a) * p.r * j + o, py = Math.sin(a) * p.r * .42 * j + o; if (first) { ctx.moveTo(px, py); first = false; } else ctx.lineTo(px, py); } ctx.lineTo(o, o); ctx.closePath(); };
  ctx.fillStyle = C.pad; path(2); ctx.fill();                                   // fill sits 2px off the outline (print misregistration)
  ink(C.rim); ctx.lineWidth = 2; ctx.globalAlpha = (1 - sk) * .5; p.veins.forEach(a => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * p.r * .8, Math.sin(a) * p.r * .34); ctx.stroke(); }); ctx.globalAlpha = 1 - sk;
  ink(C.ink); ctx.lineWidth = 3.2; path(0); ctx.stroke();
  if (p.lucky) { ctx.fillStyle = C.red; ctx.beginPath(); ctx.ellipse(0, 0, 9, 4, 0, 0, 6.283); ctx.fill(); }
  ctx.restore();
}
function drawFrog(x, y, sq, rot, alpha) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sq[0] * 1.35, sq[1] * 1.35); ctx.globalAlpha = alpha; ink(C.ink);
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(-4, -22, 34, 24, 0, 0, 6.283); ctx.fill();
  ctx.beginPath(); ctx.ellipse(26, -28, 19, 15, -.15, 0, 6.283); ctx.fill();
  ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-26, -12); ctx.quadraticCurveTo(-44, -4, -30, 4); ctx.lineTo(-6, 4); ctx.stroke();    // folded back leg
  ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(14, -10); ctx.lineTo(30, 3); ctx.stroke();
  ctx.fillStyle = C.paper; ctx.beginPath(); ctx.arc(30, -40, 6.5, 0, 6.283); ctx.fill(); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(32, -40, 2.8, 0, 6.283); ctx.fill();
  ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(-8, -36, 6.5, 0, 6.283); ctx.fill();   // the one red mark on the frog
  ctx.restore();
}
function drawText(s, x, y, size, col, a, align) { ctx.font = `500 ${size}px ${FONT}`; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = a == null ? 1 : a; ctx.fillStyle = col; ctx.fillText(s, x, y); ctx.globalAlpha = 1; }
function brush(x1, y, x2, w, a) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(x1, y); ctx.quadraticCurveTo((x1 + x2) / 2, y - w * .7, x2, y - w * .2); ctx.quadraticCurveTo((x1 + x2) / 2, y + w, x1, y + w * .35); ctx.fill(); ctx.restore(); }

function draw() {
  ctx.setTransform(sc, 0, 0, sc, 0, 0); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
  const sh = trauma * trauma * CFG.feel.shakeMax, ox = (Math.sin(tm * 71) + Math.sin(tm * 37)) * .5 * sh, oy = (Math.sin(tm * 59 + 1) + Math.sin(tm * 43)) * .5 * sh;
  // water wash strokes (parallax)
  const span = W + 500; ctx.fillStyle = C.wash;
  washes.forEach(w => { const x = (((w.x - camX * w.par + Math.sin(tm * .2 + w.ph) * 18) % span) + span) % span - 250, y = H * .6 + w.y * H * .5; ctx.globalAlpha = w.a; ctx.beginPath(); ctx.ellipse(x, y, w.w, w.h, 0, 0, 6.283); ctx.fill(); }); ctx.globalAlpha = 1;
  ctx.save(); ctx.translate(ANCHOR(), WATER()); ctx.scale(1 + zoom, 1 + zoom); ctx.translate(-ANCHOR() + ox, -WATER() + oy); ctx.translate(-camX, 0);
  rings.forEach(r => { if (r.l < 0) return; const k = eOutCubic(r.l / .7); ctx.globalAlpha = (1 - k) * .8; ink(r.col); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(r.x, r.y, 14 + k * 90, (14 + k * 90) * .4, 0, 0, 6.283); ctx.stroke(); }); ctx.globalAlpha = 1;
  pads.forEach(p => { const x = posOf(p, tm); if (x + p.r > camX - 40 && x - p.r < camX + W + 40) drawPad(p, tm); });
  // target ring on the next pad
  if ((st === 'play' || st === 'menu') && f.mode === 'idle') { const p = pads[f.i + 1], x = posOf(p, tm); ink(C.red); ctx.lineWidth = 3; ctx.globalAlpha = .55 + .3 * Math.sin(tm * 5); ctx.beginPath(); ctx.ellipse(x, p.y, p.r * 1.12, p.r * .5, 0, 0, 6.283); ctx.stroke(); ctx.globalAlpha = 1; }
  // charge preview: dotted arc, first half only
  if (f.mode === 'idle' && holding && st === 'play') { const t = chargeT / CFG.charge.maxS, d = distOf(t), sx = posOf(pads[f.i], tm) + f.ox, sy = pads[f.i].y - 6, h = 70 + d * .26; ctx.fillStyle = C.ink;
    for (let k = 1; k <= 7; k++) { const u = k / 14, px = sx + d * u, py = sy - h * 4 * u * (1 - u); ctx.globalAlpha = .65 - k * .05; ctx.beginPath(); ctx.arc(px, py, 4.2 - k * .3, 0, 6.283); ctx.fill(); } ctx.globalAlpha = 1; }
  // brush trail
  for (let i = 1; i < trail.length; i++) { const a = trail[i - 1], b = trail[i], k = 1 - b.l / .35; ink(C.ink); ctx.globalAlpha = k * .6; ctx.lineWidth = 12 * k; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } ctx.globalAlpha = 1;
  // frog
  if (f.mode !== 'dead') {
    let x, y, sq = f.sq, rot = 0;
    if (f.mode === 'air') { x = lerp(f.sx, f.tx, f.u); const base = lerp(f.sy, f.ty, f.u); y = base - f.h * 4 * f.u * (1 - f.u); rot = (f.u - .5) * .7; sq = [1 / Math.max(.85, 1 - .1 * Math.sin(f.u * 3.14)), 1 + .12 * Math.sin(f.u * 3.14)];
      ctx.fillStyle = 'rgba(29,27,26,.2)'; ctx.beginPath(); ctx.ellipse(x, base + 4, 30 * (1 - .4 * Math.sin(f.u * 3.14)), 9, 0, 0, 6.283); ctx.fill(); }
    else { x = posOf(pads[f.i], tm) + f.ox; y = pads[f.i].y - 6 + (pads[f.i].sink > 0 ? clamp(pads[f.i].sink / 1.2, 0, 1) * 30 : 0);
      if (holding && st === 'play') { const t = chargeT / CFG.charge.maxS; sq = [lerp(1, CFG.feel.squashCharge[0], t), lerp(1, CFG.feel.squashCharge[1], t)]; }
      else if (f.sqT <= 0) { const b = rm(Math.sin(tm * 2.4) * .02); sq = [1 - b, 1 + b]; } else sq = [lerp(1, f.sq[0], f.sqT / CFG.feel.settle), lerp(1, f.sq[1], f.sqT / CFG.feel.settle)]; }
    drawFrog(x, y, sq, rot, 1); }
  parts.forEach(p => { const k = 1 - p.l / p.max; ctx.globalAlpha = k; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * k + .5, 0, 6.283); ctx.fill(); }); ctx.globalAlpha = 1;
  pops.forEach(p => { const k = p.l / .9, s = 46 * (k < .15 ? eOutBack(k / .15) : 1); drawText(p.t, p.x, p.y - k * 40, s, p.col, 1 - Math.pow(k, 3)); });
  ctx.restore();
  // ---- HUD / screens (screen space) ----
  if (st === 'play') { const s = 1 + .15 * rm(eOutCubic(scorePop)); ctx.save(); ctx.translate(W / 2, H * .13); ctx.scale(s, s); drawText(String(score), 0, 0, 150, C.ink, .9); ctx.restore();
    if (combo > 1) drawText('x' + combo, W / 2, H * .13 + 100, 54, C.gold, 1); }
  if (st === 'menu') { drawText('LILY', W / 2, H * .15, 150, C.ink); drawText('POND', W / 2, H * .15 + 130, 150, C.ink); brush(W / 2 - 220, H * .15 + 215, W / 2 + 220, 16, .85);
    drawText('HOLD', W / 2, H * .36, 64, C.red, .6 + .4 * Math.sin(tm * 4)); drawText('then let go to leap', W / 2, H * .36 + 54, 30, C.ink, .7); if (best) drawText('BEST ' + best, W / 2, H * .9 - 60, 38, C.gold); }
  if (st === 'over' && !CLIP) { const k = clamp((tm - overT) / .5, 0, 1); drawText('SPLASH', W / 2, H * .2, 120 * eOutBack(Math.min(1, k * 1.4)) + 1, C.ink); drawText(String(score), W / 2, H * .2 + 140, 160, C.ink, .9);
    drawText(score >= best && score > 0 ? 'NEW BEST' : 'BEST ' + best, W / 2, H * .2 + 250, 44, C.gold); if (k >= 1) drawText('TAP TO LEAP AGAIN', W / 2, H * .2 + 345, 40, C.red, .8 + .2 * Math.sin(tm * 4)); }
  if (st !== 'play' && !CLIP) drawText('MOTION: ' + (RM ? 'REDUCED' : 'FULL') + '  [R]', W / 2, H - 50, 26, C.ink, .55);
  if (!CLIP) { ink(C.ink); ctx.lineWidth = 4; ctx.globalAlpha = .75; const mx = W - 56, my = 58; ctx.beginPath(); ctx.arc(mx, my, 20, 0, 6.283); ctx.stroke(); if (muted) { ctx.beginPath(); ctx.moveTo(mx - 24, my + 24); ctx.lineTo(mx + 24, my - 24); ctx.stroke(); } else { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(mx, my, 7, 0, 6.283); ctx.fill(); } ctx.globalAlpha = 1; }
  if (flash > 0) { ctx.fillStyle = C.paper; ctx.globalAlpha = flash * .6; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  ctx.globalAlpha = .06; ctx.fillStyle = grain; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .5, W / 2, H / 2, Math.max(W, H) * .8); vg.addColorStop(0, 'rgba(60,45,20,0)'); vg.addColorStop(1, 'rgba(60,45,20,.18)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  if (paused) { ctx.fillStyle = 'rgba(239,230,210,.85)'; ctx.fillRect(0, 0, W, H); drawText('PAUSED', W / 2, H / 2, 110, C.ink); drawText('tap to resume', W / 2, H / 2 + 90, 36, C.red); }
}

// ---- input ----
const pt = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
cv.addEventListener('pointerdown', e => { e.preventDefault(); const p = pt(e); audio();
  if (p.x > W - 110 && p.y < 110) { muted = !muted; store.set('lily.mute', muted ? '1' : '0'); applyGain(); if (!muted) { audio(); sfx.tick(); } return; }
  if (st !== 'play' && p.y > H - 110) { RM = !RM; store.set('lily.rm', RM ? '1' : '0'); sfx.tick(); return; }
  if (paused) { setPaused(false); return; } try { cv.setPointerCapture(e.pointerId); } catch (x) {} press(); });
cv.addEventListener('pointerup', release); cv.addEventListener('pointercancel', release); cv.addEventListener('lostpointercapture', release);
addEventListener('keydown', e => { if (e.repeat) return; if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'Enter') { e.preventDefault(); if (paused) setPaused(false); else press(); }
  else if (e.code === 'KeyM') { muted = !muted; store.set('lily.mute', muted ? '1' : '0'); applyGain(); } else if (e.code === 'KeyR') { RM = !RM; store.set('lily.rm', RM ? '1' : '0'); } else if (e.code === 'KeyP' && st === 'play') setPaused(!paused); });
addEventListener('keyup', e => { if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'Enter') release(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { holding = false; sfx.chargeStop(); if (st === 'play') setPaused(true); ac && ac.suspend(); } else ac && !muted && ac.resume(); });
addEventListener('blur', () => { holding = false; sfx.chargeStop(); });
if (Q.has('debug')) Object.defineProperty(window, '__game', { value: { get state() { return st; }, get score() { return score; }, get perfects() { return perfects; } } });   // QA hook, only with ?debug
platform.onPauseRequest(p => { if (p && st === 'play') setPaused(true); });   // portal pauses; player taps to resume
platform.onAudioChange(en => { portalMute = !en; applyGain(); });

// ---- loop: fixed 60 Hz step, render each frame ----
let last = 0, acc = 0;
function frame(now) { requestAnimationFrame(frame); const d = Math.min(.1, (now - last) / 1000); last = now; acc += d; while (acc >= 1 / 60) { update(1 / 60); acc -= 1 / 60; } draw(); }
const fontReady = (document.fonts && document.fonts.load) ? document.fonts.load(`500 40px ${FONT}`).catch(() => {}) : Promise.resolve();
Promise.all([Promise.resolve(platform.init()).catch(() => {}), fontReady]).then(() => { last = performance.now(); requestAnimationFrame(frame); requestAnimationFrame(() => platform.loadingDone()); });   // loadingDone after the first frame is on screen
})();
