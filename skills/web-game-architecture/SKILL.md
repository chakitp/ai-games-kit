---
name: web-game-architecture
description: Default stack, folder layout, game loop, input layer, platform adapter, config and build setup for portal-ready HTML5 games. Use when scaffolding a new game or restructuring code so it can export to multiple portals.
---

# Web Game Architecture

## Stack choice (pick, don't debate)
- **2D arcade/casual (default)**: TypeScript or plain ES modules + Canvas2D, bundled with Vite. Zero engine for tiny games; fastest load, full control.
- **Needs physics/tilemaps/scenes**: Phaser 3 (tree-shake, avoid loading unused plugins) or PixiJS for rendering only.
- **3D**: three.js (use `three/examples` selectively, KTX2/Draco/Meshopt compression).
- Avoid Unity/Godot web exports for portal casual games unless the user insists: large initial downloads, iOS memory problems (CrazyGames disables Unity on iOS by default).

## Layout
```
index.html            # root of every export; relative paths only
src/
  main.js             # boot -> platform.init -> assets -> menu
  config.js           # ALL tunables incl. feel.* and difficulty curve
  loop.js             # fixed 60 Hz update, interpolated render
  input.js            # action map for kbd/mouse/touch/gamepad
  state.js            # scene state machine
  audio.js            # WebAudio, unlock on first gesture, mute persisted
  save.js             # localStorage in try/catch + in-memory fallback
  platform.js         # adapter interface; selected at build time
  platforms/{none,poki,crazygames,youtube,gamedistribution,itch}.js
  theme.js            # art bible tokens
assets/               # compressed, named, licensed (LICENSES.md)
scripts/              # kit scripts (audit, playtest, clip)
docs/                 # brief, art bible, feel, perf, QA
```

## Platform adapter contract (`src/platform.js`)
Every portal implements the same interface; game code only calls these:
```js
init()                 // load SDK if applicable, resolve when ready
loadingDone()          // first interactive frame ready (YT: firstFrameReady; CG: loadingStop)
gameplayStart()        // first real input / run begins
gameplayStop()         // pause, menu, death, level end
breakBetween()         // interstitial slot (Poki commercialBreak, CG midgame ad); resolves when done
rewarded(cb)           // rewarded slot; resolves {granted:boolean}
saveGet(key) / saveSet(key, val)
onPauseRequest(fn)     // fn(paused:boolean): portal says pause (YT pause)
onAudioChange(fn)      // fn(enabled:boolean): portal audio flag (YT)
submitScore(n)         // YT sendScore etc. (no-op elsewhere)
```
Adapters live in the kit's `platforms/*.js` as plain browser scripts that set `window.__PLATFORM__`. `scripts/build-portal.mjs` injects the right one as `platform.js` before the game script, so game code does `Object.assign({}, NOOP, window.__PLATFORM__ || {})` and also runs standalone. Call order: `await init()` -> first frame painted -> `loadingDone()`; `gameplayStart()` on first input and on resume; `gameplayStop()` on pause/death; `await breakBetween(setMuted)` between death and retry; `submitScore(n)` at run end. Keep the sim frozen while an ad is running. **Never call `gameplayStart/Stop` (or any other portal method except `init`) during boot or while setting up the menu**: build the menu state quietly and send `gameplayStart()` only on the first real input. Poki's SDK rejects it before `init` finishes, and `playtest --mock-sdk` fails on it (this exact bug was caught in LILY POND). See `examples/offcut/game.js` for a reference integration.

## Loop
Accumulator-based fixed step (dt = 1/60), clamp frame delta to 100 ms, render with alpha interpolation. Pause when `document.hidden`. Use `requestAnimationFrame` only; never `setInterval` for gameplay.

## Canvas
Base logical resolution (e.g. 1280x720 or 720x1280). Scale-to-fit with letterbox; backing store = css size x min(DPR, 2). Disable image smoothing for pixel art. `touch-action: none; user-select: none; overscroll-behavior: none` on the container. Prevent page scroll (arrow keys, space, wheel) while focused.

## Build
`vite build` with `base: './'`, `build.target: 'es2020'`, minify, no sourcemaps in dist, hashed asset names limited to `[a-z0-9_.-]` (YouTube filename rule). Per-portal scripts: `npm run build:poki`, etc. produce `dist/<portal>/`.

## Bot / attract mode (cheap, high payoff)
Add `?bot=1` (and treat `?clip=1` as bot + clean HUD): an autoplayer that drops/acts with randomized imperfection (e.g. 40% perfect, rest offset by up to ~30 px), starts from the menu after ~0.8 s and restarts after game over. It gives `record-clip.mjs` real, varied footage with zero scripted actions, doubles as a soak test for QA, and makes a living title screen. Seed the RNG via `?seed=` so any run is reproducible.
