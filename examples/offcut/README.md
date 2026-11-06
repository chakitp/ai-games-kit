# OFF-CUT: worked example built with the kit

Tap to drop a sliding slab; overhang is trimmed, perfect drops keep your width and build a combo. Single-file game (`index.html` + `game.js`, ~14 KB, zero dependencies).

Run: `npx serve examples/offcut` (or open via any static server). Add `?bot=1` to watch the autoplayer, `?seed=7` for a reproducible run.

Kit checks run on it:
- `node scripts/playtest.mjs examples/offcut`: PASS (60 fps median on desktop and both phone viewports, no errors, input reacts)
- `node scripts/audit-bundle.mjs examples/offcut --portal all`: PASS
- `node scripts/record-clip.mjs examples/offcut --clip --seconds 22`: produced `../offcut-marketing/offcut-bot.mp4` (1080x1920, 60 fps)

Art direction (from `anti-slop-art`): risograph two-ink print, pink + teal on cream, halftone shadows, misregistered ink layer, paper grain. Feel: hit-stop, trauma shake, squash on land, ring + paper-confetti bursts, pentatonic combo audio (procedural WebAudio).

Polish pass applied: self-hosted Bowlby One (OFL, see `assets/LICENSES.md`), reduced-motion support (OS setting, `R` key, or the menu label; persisted), halftoned side margins on wide screens. The pass also caught a real bug (a typo'd config key produced NaN canvas transforms), which led to a new non-finite-value check in `playtest.mjs`.

Portal-ready: uses `window.__PLATFORM__` (init, loadingDone after first frame, gameplayStart/Stop, ad break between death and retry with audio muted and sim frozen, submitScore, portal pause/audio hooks). `node scripts/build-portal.mjs examples/offcut --portal all` produces four bundles that pass audit + `--mock-sdk` playtests.

Known gaps: real SDKs untested here (sandbox has no access to portal CDNs; only offline mocks); landscape phones show the portrait field small; no level of difficulty beyond speed ramp; SFX are synthesized and unmixed against any music (no music yet).
