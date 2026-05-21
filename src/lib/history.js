(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else { root.TTT = root.TTT || {}; root.TTT.history = mod; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var MAX_HISTORY = 200;
  var DEDUP_MS = 24 * 3600 * 1000;

  // Returns new history array (does not mutate input)
  function addToHistory(history, item, now) {
    now = now || new Date();
    var nowMs = now.getTime();
    var key = (item.text || '').toLowerCase().trim();
    var sl = item.sl || 'en';
    var tl = item.tl || 'vi';

    var arr = history.slice();
    var idx = -1;
    for (var i = 0; i < arr.length; i++) {
      var h = arr[i];
      if (h.text.toLowerCase().trim() === key && (h.sl || 'en') === sl && (h.tl || 'vi') === tl) {
        var hDate = new Date(h.date).getTime();
        if (nowMs - hDate < DEDUP_MS) { idx = i; break; }
      }
    }

    if (idx >= 0) {
      var existing = arr.splice(idx, 1)[0];
      existing = { text: existing.text, translation: existing.translation, sl: existing.sl || 'en', tl: existing.tl || 'vi', date: now.toISOString(), count: (existing.count || 1) + 1 };
      arr.unshift(existing);
    } else {
      arr.unshift({
        text: item.text,
        translation: item.translation,
        sl: sl,
        tl: tl,
        date: now.toISOString(),
        count: 1
      });
    }

    if (arr.length > MAX_HISTORY) arr.length = MAX_HISTORY;
    return arr;
  }

  return { addToHistory: addToHistory, MAX_HISTORY: MAX_HISTORY, DEDUP_MS: DEDUP_MS };
});
