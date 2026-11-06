// AI Games Kit portal adapter: itch.io (no SDK). Same contract as every adapter.
(function () {
  var playing = false, mem = {};
  window.__PLATFORM__ = {
    name: 'itch',
    init: function () { return Promise.resolve(); },
    loadingDone: function () {},
    gameplayStart: function () { playing = true; },
    gameplayStop: function () { playing = false; },
    breakBetween: function () { return Promise.resolve(); },
    rewarded: function () { return Promise.resolve({ granted: false }); },
    saveGet: function (k) { try { return localStorage.getItem(k); } catch (e) { return mem[k] == null ? null : mem[k]; } },
    saveSet: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } },
    onPauseRequest: function () {},      // fn(paused:boolean)
    onAudioChange: function () {},       // fn(enabled:boolean)
    submitScore: function () {}
  };
})();
