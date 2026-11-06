window.__sdkLog = window.__sdkLog || [];
(function () { var L = function (n) { window.__sdkLog.push(n); };
  window.PokiSDK = { init: function () { L('init'); return Promise.resolve(); }, gameLoadingStart: function () { L('gameLoadingStart'); }, gameLoadingFinished: function () { L('gameLoadingFinished'); },
    gameplayStart: function () { L('gameplayStart'); }, gameplayStop: function () { L('gameplayStop'); }, commercialBreak: function () { L('commercialBreak'); return new Promise(function (r) { setTimeout(r, 50); }); },
    rewardedBreak: function () { L('rewardedBreak'); return Promise.resolve(true); }, setDebug: function () {} }; })();
