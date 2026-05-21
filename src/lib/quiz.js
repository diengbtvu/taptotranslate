(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else { root.TTT = root.TTT || {}; root.TTT.quiz = mod; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Grade a typing answer against expected.
  // Returns { correct: bool, typo: bool, distance: number }
  function gradeTyping(answer, expected) {
    var a = (answer || '').trim().toLowerCase();
    var e = (expected || '').trim().toLowerCase();
    if (a === e) return { correct: true, typo: false, distance: 0 };
    var d = levenshtein(a, e);
    if (d <= 2) return { correct: true, typo: true, distance: d };
    return { correct: false, typo: false, distance: d };
  }

  // Create a cloze question from a sentence and target word.
  // Returns { sentence: string, blank: string } or null if word not found.
  function makeCloze(sentence, word) {
    if (!sentence || !word) return null;
    var re = new RegExp('\\b' + escapeRegex(word) + '\\b', 'i');
    if (!re.test(sentence)) return null;
    return { sentence: sentence.replace(re, '____'), blank: word };
  }

  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    var matrix = [];
    for (var i = 0; i <= b.length; i++) matrix[i] = [i];
    for (var j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (i = 1; i <= b.length; i++) {
      for (j = 1; j <= a.length; j++) {
        var cost = b[i - 1] === a[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(matrix[i-1][j]+1, matrix[i][j-1]+1, matrix[i-1][j-1]+cost);
      }
    }
    return matrix[b.length][a.length];
  }

  return { gradeTyping: gradeTyping, makeCloze: makeCloze };
});
