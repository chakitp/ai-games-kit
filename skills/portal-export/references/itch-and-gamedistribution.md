# itch.io and GameDistribution

## itch.io (open, no SDK)
Docs: https://itch.io/docs/creators/html5
- Upload a ZIP with `index.html` at the root; set kind of project = HTML, check "This file will be played in the browser".
- Limits (per summary of docs): 500 MB extracted, 200 MB per file, 1,000 files. Verify on the docs page.
- Set embed viewport size (e.g. 960x540) or "Click to launch in fullscreen" for mobile; enable fullscreen button; enable SharedArrayBuffer only if you need threads (Safari limitations).
- Revenue: you choose itch's cut on sales; free games are fine. Great for feedback, devlogs and a canonical page to link from videos.
- Use the no-op platform adapter (or a tiny one that saves to localStorage).

## GameDistribution (application-based distribution)
Docs: https://gamedistribution.com/ (developer docs / SDK)
- Apply with a playable build; GD distributes to many publisher sites and monetizes via ads.
- SDK: load `GD_OPTIONS` with `gameId` and an `onEvent` callback; pause + mute on `SDK_GAME_PAUSE`, resume on `SDK_GAME_START`; request ads with `gdsdk.showAd()` only after user input, not on load.
- Per the summary guide: revenue share paid monthly once the balance reaches 50 EUR; no published size cap, but keep the same Poki/CrazyGames budgets because sites embed your game in iframes everywhere.
- Verify all of the above in the live docs before submission; GD terms and SDK options change.

## Adapters
`src/platforms/none.js` for itch; `src/platforms/gamedistribution.js` wraps `gdsdk` with the same contract (de-duplicate gameplay events, mute during ads).
