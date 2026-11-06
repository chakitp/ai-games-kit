window.__sdkLog = window.__sdkLog || [];
(function () { var L = function (n) { window.__sdkLog.push(n); }, store = {};
  window.CrazyGames = { SDK: { init: function () { L('init'); return Promise.resolve(); },
    game: { gameplayStart: function () { L('gameplayStart'); }, gameplayStop: function () { L('gameplayStop'); }, loadingStart: function () { L('loadingStart'); }, loadingStop: function () { L('loadingStop'); } },
    ad: { requestAd: function (t, cb) { L('requestAd:' + t); cb.adStarted && cb.adStarted(); setTimeout(function () { cb.adFinished && cb.adFinished(); }, 50); } },
    data: { getItem: function (k) { return store[k] == null ? null : store[k]; }, setItem: function (k, v) { store[k] = v; } } } }; })();
