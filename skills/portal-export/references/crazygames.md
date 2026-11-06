# CrazyGames

Docs: https://docs.crazygames.com/ (technical requirements: https://docs.crazygames.com/requirements/technical)
Verified from the technical requirements page on 2026-11-05.

## Hard rules
- **Total 250 MB, max 1,500 files.** **Initial download <= 50 MB; <= 20 MB to qualify for the mobile homepage.** With the SDK, initial download is measured up to the first `gameplayStart`; without it, total size is used.
- Externally hosted files: time to gameplay must be <= 20 s.
- **Relative paths only**; absolute paths fail.
- Orientation is chosen at submission and enforced by the site (rotate prompt); no custom lock needed. Desktop landscape expected; portrait accepted (black bars/background art).
- CSS: `body { user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; }` to prevent tablet magnifier/context menus.
- Mobile app: handle safe-area insets. iOS audio: call `resume()` on a suspended AudioContext inside a user gesture (`touchend`/`click`).
- Browsers: Chrome and Edge expected; Safari problems -> disabled there. Chromebooks: disabled if not smooth on 4 GB RAM.
- Input: mouse + keyboard; add touch if mobile is supported. Unity: disabled on iOS by default.
- Sitelock: if used, whitelist all CrazyGames domains incl. iOS/Android app origins.

## Launch tracks
- **Basic Launch**: SDK optional, **no ads/monetization** (ads disabled even if integrated). Use for fast first listing.
- **Full Launch**: SDK integration required: `gameplayStart/gameplayStop`, data module for saves (if applicable), user module for accounts (if applicable); ads via midgame/rewarded; optional `loadingStart/loadingStop` for load telemetry.

## SDK (v3) adapter
Ready-made: `platforms/crazygames.js`. Verify offline with `node scripts/playtest.mjs dist/crazygames --mock-sdk crazygames`. Sketch of the idea:
Script (verify current URL in docs): `https://sdk.crazygames.com/crazygames-sdk-v3.js`
```js
export default {
  async init(){ await window.CrazyGames.SDK.init(); },
  loadingDone(){ window.CrazyGames.SDK.game.loadingStop?.(); },
  gameplayStart(){ window.CrazyGames.SDK.game.gameplayStart(); },
  gameplayStop(){ window.CrazyGames.SDK.game.gameplayStop(); },
  breakBetween(muteFn){ return new Promise(res=>window.CrazyGames.SDK.ad.requestAd('midgame',{
      adStarted:()=>muteFn(true), adFinished:()=>{muteFn(false);res();}, adError:()=>{muteFn(false);res();} })); },
  rewarded(muteFn){ return new Promise(res=>window.CrazyGames.SDK.ad.requestAd('rewarded',{
      adStarted:()=>muteFn(true), adFinished:()=>{muteFn(false);res({granted:true});}, adError:()=>{muteFn(false);res({granted:false});} })); },
  saveGet:(k)=>window.CrazyGames.SDK.data.getItem(k),
  saveSet:(k,v)=>window.CrazyGames.SDK.data.setItem(k,v),
  onPauseRequest(){}, submitScore(){}
};
```
Keep gameplayStart/Stop de-duplicated like the Poki adapter. Fall back to localStorage if the data module is unavailable.

## Submission
Developer portal -> upload zip (index.html at root) -> fill title, descriptions, tags, orientation, thumbnails (portrait + landscape variants requested in the form), then QA review. Start with Basic Launch if SDK/ads aren't integrated yet.
