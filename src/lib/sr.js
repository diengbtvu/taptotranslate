(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else { root.TTT = root.TTT || {}; root.TTT.sr = mod; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // SM-2 inspired spaced repetition
  // quality: 'hard' | 'ok' | 'easy'
  function review(word, quality, now) {
    now = now || new Date();
    var interval = word.srInterval || 1;
    var ease = word.srEase || 2.5;
    var lapses = word.srLapses || 0;

    if (quality === 'hard') {
      interval = 1;
      ease = Math.max(1.3, ease - 0.3);
      lapses++;
    } else if (quality === 'ok') {
      interval = Math.ceil(interval * ease);
    } else { // easy
      interval = Math.ceil(interval * ease * 1.3);
      ease = Math.min(3.0, ease + 0.1);
    }

    var next = new Date(now.getTime() + interval * 86400000);
    return {
      srInterval: interval,
      srEase: ease,
      srLapses: lapses,
      srNext: next.toISOString(),
      lastReview: now.toISOString()
    };
  }

  function isDue(word, now) {
    now = now || new Date();
    return word.level !== 'mastered' && new Date(word.srNext) <= now;
  }

  function getNextIntervals(word) {
    var ease = word.srEase || 2.5;
    var interval = word.srInterval || 1;
    return {
      hard: 1,
      ok: Math.ceil(interval * ease),
      easy: Math.ceil(interval * ease * 1.3)
    };
  }

  return { review: review, isDue: isDue, getNextIntervals: getNextIntervals };
});
