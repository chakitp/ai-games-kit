window.__sdkLog = window.__sdkLog || [];
(function () { var L = function (n) { window.__sdkLog.push(n); };
  window.ytgame = { IN_PLAYABLES_ENV: true,
    game: { firstFrameReady: function () { L('firstFrameReady'); }, gameReady: function () { L('gameReady'); }, saveData: function () { L('saveData'); return Promise.resolve(); }, loadData: function () { L('loadData'); return Promise.resolve(''); } },
    engagement: { sendScore: function () { L('sendScore'); return Promise.resolve(); } },
    health: { logError: function () { L('logError'); }, logWarning: function () { L('logWarning'); } },
    system: { isAudioEnabled: function () { return true; }, onAudioEnabledChange: function () { return function () {}; }, onPause: function () { L('onPause:subscribed'); return function () {}; }, onResume: function () { return function () {}; } } }; })();
