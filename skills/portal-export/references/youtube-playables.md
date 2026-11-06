# YouTube Playables

Docs: https://developers.google.com/youtube/gaming/playables (certification: https://developers.google.com/youtube/gaming/playables/certification/requirements_stability , FAQ: .../support/certification_faq)
Size/stability numbers verified on 2026-11-05. SDK method names below come from the Playables SDK docs as known at authoring time; **re-check the SDK reference page before shipping**.

## Access
Invitation / developer-portal based with certification review. Tell the user plainly: you cannot self-publish; prepare the certified-ready bundle and apply/test through the portal.

## Hard rules (MUST) and recommendations (SHOULD)
- Initial bundle **MUST < 30 MiB, SHOULD < 15 MiB** (counted from page load until `gameReady`).
- Total bundle **MUST < 250 MiB** (default). Individual file **MUST < 30 MiB, SHOULD < 512 KiB**. **MUST <= 8,000 files.**
- Saved game data **MUST < 3 MiB, SHOULD < 500 KiB**.
- Should be interactive in **< 5 s**.
- **Peak JS heap MUST NOT exceed 512 MB.** No reproducible crashes; works in Chrome, Edge, Firefox and in the YouTube Android/iOS apps; standards-based Web APIs only (JS, Canvas, WebGL).
- Relative paths only. **File names only letters, digits, `_`, `-`, `.`.**
- Use the Playables bundle analyzer / test suite from the developer portal for official validation.

## SDK (verify names in docs)
Script: `https://www.youtube.com/game_api/v1` (injected by `scripts/build-portal.mjs`). Ready-made adapter: `platforms/youtube.js` (degrades to no-ops outside Playables).
Call order the adapter implements:
1. `ytgame.game.firstFrameReady()`: as soon as the first real frame is painted (title scene counts).
2. `ytgame.game.gameReady()`: once the game accepts input (menu interactive). **Not** on first player input.
3. `ytgame.engagement.sendScore({value})`: on run end.
4. `ytgame.system.onPause/onResume`: pause the game; `isAudioEnabled()` + `onAudioEnabledChange`: mute accordingly.
5. `ytgame.game.saveData(string)` / `loadData()`: one JSON blob (<3 MiB, ideally <500 KiB). `ytgame.health.logError()` for errors.
There are no gameplayStart/Stop events in this SDK, and no ads or interstitials from the game. Test offline with `node scripts/playtest.mjs dist/youtube --mock-sdk youtube`; confirm names against the live SDK reference before submitting.

## Design implications
- No external links, no purchases, no ads in your code; the platform owns those.
- Short sessions with instant restart suit the Shorts-like feed context; make the first 5 s self-explanatory with touch controls as the primary input.
- Persist progress through the SDK save API (one JSON blob, keep small).

## Submission kit
Bundle zip (index.html root), 1:1 and 16:9 thumbnails, short description, controls, privacy statement per portal form. Run the bundle analyzer before applying.
