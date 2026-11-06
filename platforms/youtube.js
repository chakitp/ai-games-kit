// YouTube Playables adapter. Degrades to no-ops outside the Playables environment.
// Verify method names against https://developers.google.com/youtube/gaming/playables/reference/sdk before submitting.
(function () {
  var mem = {}, yt = function () { return window.ytgame; }, first = false, readyDone = false;
  function safe(fn) { try { return fn(); } catch (e) {} }
  window.__PLATFORM__ = {
    name: 'youtube',
    init: function () { return Promise.resolve(); },
    // Called once the first real frame is painted AND the game accepts input (menu is interactive).
    loadingDone: function () {
      if (!first) { first = true; safe(function () { yt() && yt().game.firstFrameReady(); }); }
      if (!readyDone) { readyDone = true; safe(function () { yt() && yt().game.gameReady(); }); }
    },
    gameplayStart: function () {}, gameplayStop: function () {},       // no gameplay events in the Playables SDK
    breakBetween: function () { return Promise.resolve(); },            // platform owns ads
    rewarded: function () { return Promise.resolve({ granted: false }); },
    saveGet: function (k) { var raw = null; try { raw = localStorage.getItem('yt.' + k); } catch (e) { raw = mem[k] == null ? null : mem[k]; } return raw; },
    saveSet: function (k, v) { try { localStorage.setItem('yt.' + k, v); } catch (e) { mem[k] = v; } },
    // Optional: persist one small JSON blob through the SDK (<3 MiB, ideally <500 KiB).
    saveBlob: function (obj) { return Promise.resolve(safe(function () { return yt() && yt().game.saveData(JSON.stringify(obj)); })); },
    loadBlob: function () { return Promise.resolve(safe(function () { return yt() && yt().game.loadData(); })).then(function (s) { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } }); },
    onPauseRequest: function (fn) { safe(function () { if (!yt()) return; yt().system.onPause(function () { fn(true); }); yt().system.onResume(function () { fn(false); }); }); },
    onAudioChange: function (fn) { safe(function () { if (!yt()) return; fn(!!yt().system.isAudioEnabled()); yt().system.onAudioEnabledChange(function (en) { fn(!!en); }); }); },
    submitScore: function (n) { safe(function () { yt() && yt().engagement.sendScore({ value: Math.floor(n) }); }); }
  };
})();
