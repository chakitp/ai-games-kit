# Poki

Docs: https://sdk.poki.com/ (requirements: https://sdk.poki.com/new-requirements) · Developer site: https://developers.poki.com/
Verified from the requirements page on 2026-11-05.

## Hard rules
- **Initial download target < 8 MB.** Progressive loading recommended. No splash screens; a small studio logo on the loading screen is allowed.
- **Aspect**: fill the whole screen in portrait and/or landscape; 16:9 reference sizes 640x360, 836x470, 1031x580; force mobile controls on tablets.
- **Only Poki ads.** No own ad timers (Poki controls frequency), mute audio during ads, one video per reward, never grant rewards when an ad blocker is detected, no custom ad-blocked messages.
- **Rewarded UI**: a standard green "continue" button, equal or larger than the reward button, beside/above it; reward buttons are not green and show a video icon; both shown at once.
- **External requests blocked by default** (no third-party fonts, images, audio, CDN libs). Google products incl. Analytics always blocked. Multiplayer servers/analytics need a privacy statement. External links need an in-game privacy-policy UI with a hosted URL (not a Google Doc).
- Remove purchase UI (buy currency / remove ads), outbound links, splash screens, dev tools and debug code.
- Wrap localStorage in try/catch; save progress or tell the player it won't be saved; stop viewport scroll from moving the parent page; cutscenes skippable; profanity filter for multiplayer usernames; static + animated thumbnails; multiple UI languages with layouts that tolerate longer text.

## SDK events
- `PokiSDK.init()` then `PokiSDK.gameLoadingFinished()` when the loader is done (older docs: `gameLoadingStart/Finished`; check current docs).
- `PokiSDK.gameplayStart()` on the player's first input (not on load); `PokiSDK.gameplayStop()` on any interruption (pause, menu, level end, cutscene). Never the same event twice in a row. Don't fire events during midroll/rewarded ads.
- `await PokiSDK.commercialBreak()` only when returning from pause into gameplay (not for level-select transitions). Pass a callback to mute audio during the ad.
- `const ok = await PokiSDK.rewardedBreak()` for rewards.
- ESC or Space to pause/resume with the matching events.
- Script: loaded from Poki's CDN by the Poki build tooling/template (verify the current snippet in the dev docs). **This is the one allowed external script; confirm in the docs rather than assuming.**

## Adapter
Ready-made: `platforms/poki.js` (de-duplicates gameplayStart/Stop, mutes around ads, no-ops if the SDK is missing). Verify offline with `node scripts/playtest.mjs dist/poki --mock-sdk poki`. The sketch below shows the idea:
```js
export default {
  async init(){ await PokiSDK.init(); },
  loadingDone(){ PokiSDK.gameLoadingFinished(); },
  gameplayStart(){ if(!this._on){ this._on=true; PokiSDK.gameplayStart(); } },
  gameplayStop(){ if(this._on){ this._on=false; PokiSDK.gameplayStop(); } },
  async breakBetween(muteFn){ muteFn(true); await PokiSDK.commercialBreak(); muteFn(false); },
  async rewarded(muteFn){ muteFn(true); const ok = await PokiSDK.rewardedBreak(); muteFn(false); return {granted: !!ok}; },
  saveGet:(k)=>{ try{return localStorage.getItem(k)}catch{return null} },
  saveSet:(k,v)=>{ try{localStorage.setItem(k,v)}catch{} },
  onPauseRequest(){}, submitScore(){}
};
```

## Submission
Submit via the developer site; games are hand-picked and need web exclusivity. Prepare: playable link or zip, thumbnails, short pitch, controls. Expect feedback cycles; keep the QA report handy.
Revenue: ad-revenue split on Poki-sourced traffic (per Poki's published terms; verify).
