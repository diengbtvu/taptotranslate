(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else { root.TTT = root.TTT || {}; root.TTT.streak = mod; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Compute current streak and longest streak from reviewLog.
  // reviewLog: [{ date: 'YYYY-MM-DD', reviewed: N, saved: N }]
  function computeStreak(reviewLog, today) {
    if (!reviewLog || !reviewLog.length) return { current: 0, longest: 0 };
    today = today || new Date().toISOString().slice(0, 10);

    var dates = new Set(reviewLog.filter(function (r) { return r.reviewed > 0; }).map(function (r) { return r.date; }));
    if (!dates.size) return { current: 0, longest: 0 };

    // Current streak: count backwards from today
    var current = 0;
    var d = new Date(today + 'T00:00:00');
    while (dates.has(fmt(d))) {
      current++;
      d.setDate(d.getDate() - 1);
    }

    // Longest streak
    var sorted = Array.from(dates).sort();
    var longest = 1, run = 1;
    for (var i = 1; i < sorted.length; i++) {
      var prev = new Date(sorted[i-1] + 'T00:00:00');
      var cur = new Date(sorted[i] + 'T00:00:00');
      if (cur - prev === 86400000) { run++; }
      else { run = 1; }
      if (run > longest) longest = run;
    }

    return { current: current, longest: longest };
  }

  // Record activity for today
  function recordActivity(reviewLog, type, today) {
    today = today || new Date().toISOString().slice(0, 10);
    var log = (reviewLog || []).slice();
    var entry = log.find(function (r) { return r.date === today; });
    if (!entry) {
      entry = { date: today, reviewed: 0, saved: 0 };
      log.push(entry);
    }
    if (type === 'review') entry.reviewed++;
    else if (type === 'save') entry.saved++;
    return log;
  }

  // Generate heatmap data for last N weeks (default 12)
  function heatmapData(reviewLog, weeks, today) {
    weeks = weeks || 12;
    today = today || new Date().toISOString().slice(0, 10);
    var map = {};
    (reviewLog || []).forEach(function (r) { map[r.date] = r.reviewed || 0; });

    var end = new Date(today + 'T00:00:00');
    var start = new Date(end);
    start.setDate(start.getDate() - weeks * 7 + 1);

    var days = [];
    var d = new Date(start);
    while (d <= end) {
      var key = fmt(d);
      days.push({ date: key, count: map[key] || 0, dow: d.getDay() });
      d.setDate(d.getDate() + 1);
    }
    return days;
  }

  function fmt(d) {
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  return { computeStreak: computeStreak, recordActivity: recordActivity, heatmapData: heatmapData };
});
