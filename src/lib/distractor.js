(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else { root.TTT = root.TTT || {}; root.TTT.distractor = mod; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Pick n distractors from pool for target word.
  // Prefers same POS and similar length.
  function pickDistractors(target, pool, n) {
    n = n || 3;
    var candidates = pool.filter(function (w) {
      return w.text.toLowerCase() !== target.text.toLowerCase();
    });

    // Score: lower = better match as distractor
    var targetLen = target.text.length;
    var targetPos = (target.pos || '').toLowerCase();

    candidates.sort(function (a, b) {
      var sa = score(a), sb = score(b);
      return sa - sb;
    });

    function score(w) {
      var s = 0;
      if (targetPos && (w.pos || '').toLowerCase() !== targetPos) s += 10;
      s += Math.abs(w.text.length - targetLen);
      return s;
    }

    // Take top n, then shuffle so order isn't predictable
    var picked = candidates.slice(0, n);
    for (var i = picked.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = picked[i]; picked[i] = picked[j]; picked[j] = tmp;
    }
    return picked;
  }

  return { pickDistractors: pickDistractors };
});
