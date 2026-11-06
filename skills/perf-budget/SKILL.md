---
name: perf-budget
description: Performance and size budgets, measurement workflow and optimization playbook for web games targeting portals and low-end devices. Use for slow loads, low fps, memory growth, oversized bundles, or before export.
---

# Perf Budget

## Defaults (strictest portal wins)
| Metric | Target | Hard limit / source |
|---|---|---|
| Initial download | <= 8 MB | Poki target 8 MB; CrazyGames mobile homepage 20 MB; YouTube must < 30 MiB (should < 15 MiB) |
| Time to first frame | <= 3 s desktop, <= 5 s mid phone | YouTube: interactive < 5 s (should); CrazyGames: gameplay <= 20 s if externally hosted |
| Total size / files | <= 100 MB / <= 500 | CG 250 MB / 1,500; YT 250 MiB / 8,000; itch 500 MB / 1,000 |
| Single file | <= 512 KiB ideal | YT must < 30 MiB, should < 512 KiB |
| Frame | 60 fps median, p95 <= 20 ms @ 4x CPU throttle | |
| JS heap peak | <= 150 MB | YT hard limit 512 MB |
| Saved data | <= 500 KiB | YT must < 3 MiB |

## Measure
- `node scripts/audit-bundle.mjs dist --portal all` -> sizes, counts, largest files, estimated initial bundle (gzip), path/filename/external-URL violations.
- `node scripts/playtest.mjs --perf` -> rAF frame times (median/p95/max), long tasks, JS heap samples, first-frame time, with optional `--cpu 4` throttle.
- Chrome DevTools Performance for flame charts when numbers say the main thread is the problem (use the Claude-in-Chrome or built-in browser if available).

## Playbook (highest payoff first)
1. **Bytes**: convert images to WebP/AVIF (quality 75-82), downscale to display size x DPR 2 max, atlas small sprites, strip metadata. Audio: OGG/MP3, SFX mono 64-96 kbps, music 96-128 kbps, trim silence. Fonts: woff2 + subset to used glyphs. JS: minify, tree-shake, drop unused engine modules, no sourcemaps in dist.
2. **Critical path**: render a real first frame (title scene) before loading level data/music; lazy-load per level; preload only the next level; `loading="lazy"`-style deferral for non-critical assets; avoid giant JSON (binary/packed).
3. **CPU**: fixed timestep, pooling (zero allocation per frame), spatial hash for collisions, update only active entities, cache computed values, avoid `Array.filter/map` in hot loops, avoid layout thrash and DOM updates per frame (HUD via canvas or batched text updates).
4. **GPU/canvas**: pre-render complex shapes to offscreen canvases, avoid `shadowBlur`/filters on large areas, minimize state changes, batch draws, clamp DPR to 2, use `desynchronized`/`alpha:false` contexts where valid.
5. **Memory**: dispose textures/audio buffers when leaving scenes, avoid retaining closures in pools, check heap growth in the 5-minute bot test.
6. **Mobile**: smaller textures, fewer particles (quality tiers chosen by measured frame time, not UA sniffing), pause on hide.

## Rule
Every optimization must move a measured number. Report a before/after table; revert no-ops.
