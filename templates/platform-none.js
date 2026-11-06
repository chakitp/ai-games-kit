// Default no-op portal adapter. Every portal adapter implements this same contract.
// Game code calls ONLY these methods; never a portal SDK directly.
let playing = false;
const safeGet = k => { try { return localStorage.getItem(k); } catch { return mem.get(k) ?? null; } };
const mem = new Map();
export default {
  async init() {},
  loadingDone() {},                                           // first real frame is on screen
  gameplayStart() { if (!playing) { playing = true; } },      // first real input / run begins (de-duplicated)
  gameplayStop() { if (playing) { playing = false; } },       // pause, menu, death, level end
  async breakBetween(setMuted = () => {}) {},                 // interstitial slot
  async rewarded(setMuted = () => {}) { return { granted: false }; },
  saveGet: safeGet,
  saveSet(k, v) { try { localStorage.setItem(k, v); } catch { mem.set(k, v); } },
  onPauseRequest(fn) {},                                      // portal pauses/mutes you
  submitScore(n) {},
};
