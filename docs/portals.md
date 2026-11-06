# Portals and adapters

Requirement snapshot verified **2026-11-05**. Always re-check the live docs: portals change limits and SDKs. Per-portal detail: [`skills/portal-export/references/`](../skills/portal-export/references).

| Portal | Access | Limits (summary) | Adapter |
|---|---|---|---|
| **Poki** | Curated submission, web-exclusive | Initial download target < 8 MB; no external requests; no purchases or outbound links; Poki ads only | [`platforms/poki.js`](../platforms/poki.js) |
| **CrazyGames** | Open submit; Basic Launch (no ads), then Full Launch | Total 250 MB, ≤ 1,500 files; initial ≤ 50 MB (≤ 20 MB for the mobile homepage); relative paths only | [`platforms/crazygames.js`](../platforms/crazygames.js) |
| **YouTube Playables** | Invitation + certification | Initial < 30 MiB (< 15 MiB recommended); total < 250 MiB; ≤ 8,000 files; file < 30 MiB (< 512 KiB recommended); names `[A-Za-z0-9_.-]`; JS heap < 512 MB; saved data < 3 MiB | [`platforms/youtube.js`](../platforms/youtube.js) |
| **itch.io** | Open | 500 MB extracted, 200 MB per file, 1,000 files | [`platforms/itch.js`](../platforms/itch.js) |
| GameDistribution | Application | See reference | not included yet |

## The adapter contract

Games never call a portal SDK directly. They use `window.__PLATFORM__`, which `build-portal.mjs` injects as `platform.js`:

```js
init()                      // resolve when the SDK is ready (or immediately if absent)
loadingDone()               // first real frame is on screen
gameplayStart()             // first real input, and on resume (de-duplicated by the adapter)
gameplayStop()              // pause, menu, death, level end
breakBetween(setMuted)      // ad slot between death and retry; mute during the ad
rewarded(setMuted)          // -> { granted: boolean }
saveGet(key) / saveSet(key, value)
onPauseRequest(fn)          // fn(paused)   portal asks you to pause
onAudioChange(fn)           // fn(enabled)  portal audio flag
submitScore(n)
```

If the SDK is missing, every adapter degrades to no-ops, so the same game also runs standalone.

## Testing without the real SDKs

`scripts/mock-sdks/` has offline fakes. `playtest.mjs --mock-sdk <portal>` serves the fake in place of the SDK script and validates, for example:

- no duplicate consecutive `gameplayStart` / `gameplayStop`
- Poki: `gameLoadingFinished` exactly once, `gameplayStart` only after player input
- YouTube: `firstFrameReady` once, `gameReady` once, in that order
- the SDK was actually called (adapter wired)

This validates **your integration logic**, not the real SDKs. Before submitting, test against the real SDK in each portal's own preview/QA tool.

## What the kit cannot do for you

- Create portal accounts, fill submission forms or upload for you.
- Get a game accepted (Poki is curated; YouTube Playables is invitation-only).
- Promise traffic or revenue. Revenue terms differ by portal and change.
