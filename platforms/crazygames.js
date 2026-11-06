// CrazyGames SDK v3 adapter. Degrades to no-ops when the SDK is absent. Verify against https://docs.crazygames.com/ before submitting.
(function () {
  var on = false, ready = false, mem = {};
  var CG = function () { return window.CrazyGames && window.CrazyGames.SDK; };
  function ad(type, setMuted) { setMuted = setMuted || function () {};
    return new Promise(function (res) { if (!CG() || !ready) return res(false);
      try { CG().ad.requestAd(type, { adStarted: function () { setMuted(true); }, adFinished: function () { setMuted(false); res(true); }, adError: function () { setMuted(false); res(false); } }); }
      catch (e) { setMuted(false); res(false); } }); }
  window.__PLATFORM__ = {
    name: 'crazygames',
    init: function () { return CG() ? Promise.resolve(CG().init()).then(function () { ready = true; }).catch(function () {}) : Promise.resolve(); },
    loadingDone: function () { try { CG() && ready && CG().game.loadingStop && CG().game.loadingStop(); } catch (e) {} },
    gameplayStart: function () { if (!on) { on = true; try { CG() && ready && CG().game.gameplayStart(); } catch (e) {} } },
    gameplayStop: function () { if (on) { on = false; try { CG() && ready && CG().game.gameplayStop(); } catch (e) {} } },
    breakBetween: function (setMuted) { return ad('midgame', setMuted).then(function () {}); },
    rewarded: function (setMuted) { return ad('rewarded', setMuted).then(function (ok) { return { granted: ok }; }); },
    saveGet: function (k) { try { if (CG() && ready && CG().data) return CG().data.getItem(k); } catch (e) {} try { return localStorage.getItem(k); } catch (e) { return mem[k] == null ? null : mem[k]; } },
    saveSet: function (k, v) { try { if (CG() && ready && CG().data) return CG().data.setItem(k, v); } catch (e) {} try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } },
    onPauseRequest: function () {},
    onAudioChange: function () {},
    submitScore: function () {}
  };
})();
