// Poki adapter. Degrades to no-ops if the SDK is missing (dev/offline). Verify calls against https://sdk.poki.com/ before submitting.
(function () {
  var on = false, sdk = function () { return window.PokiSDK; }, mem = {};
  function safe(fn) { try { return fn(); } catch (e) {} }
  window.__PLATFORM__ = {
    name: 'poki',
    init: function () { return sdk() ? Promise.resolve(safe(function () { return sdk().init(); })).catch(function () {}) : Promise.resolve(); },
    loadingDone: function () { safe(function () { sdk() && sdk().gameLoadingFinished(); }); },
    gameplayStart: function () { if (!on) { on = true; safe(function () { sdk() && sdk().gameplayStart(); }); } },
    gameplayStop: function () { if (on) { on = false; safe(function () { sdk() && sdk().gameplayStop(); }); } },
    breakBetween: function (setMuted) { setMuted = setMuted || function () {}; if (!sdk()) return Promise.resolve();
      setMuted(true); return Promise.resolve(safe(function () { return sdk().commercialBreak(); })).catch(function () {}).then(function () { setMuted(false); }); },
    rewarded: function (setMuted) { setMuted = setMuted || function () {}; if (!sdk()) return Promise.resolve({ granted: false });
      setMuted(true); return Promise.resolve(safe(function () { return sdk().rewardedBreak(); })).catch(function () { return false; }).then(function (ok) { setMuted(false); return { granted: !!ok }; }); },
    saveGet: function (k) { try { return localStorage.getItem(k); } catch (e) { return mem[k] == null ? null : mem[k]; } },
    saveSet: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } },
    onPauseRequest: function () {},
    onAudioChange: function () {},
    submitScore: function () {}
  };
})();
