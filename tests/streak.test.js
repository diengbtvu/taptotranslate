'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { computeStreak, recordActivity, heatmapData } = require('../src/lib/streak.js');

test('computeStreak: empty log', () => {
  const r = computeStreak([], '2026-05-21');
  assert.equal(r.current, 0);
  assert.equal(r.longest, 0);
});

test('computeStreak: consecutive days', () => {
  const log = [
    { date: '2026-05-19', reviewed: 5, saved: 1 },
    { date: '2026-05-20', reviewed: 3, saved: 0 },
    { date: '2026-05-21', reviewed: 7, saved: 2 },
  ];
  const r = computeStreak(log, '2026-05-21');
  assert.equal(r.current, 3);
  assert.equal(r.longest, 3);
});

test('computeStreak: gap breaks streak', () => {
  const log = [
    { date: '2026-05-18', reviewed: 5, saved: 1 },
    { date: '2026-05-19', reviewed: 3, saved: 0 },
    // gap on 20
    { date: '2026-05-21', reviewed: 7, saved: 2 },
  ];
  const r = computeStreak(log, '2026-05-21');
  assert.equal(r.current, 1);
  assert.equal(r.longest, 2);
});

test('computeStreak: days with reviewed=0 do not count', () => {
  const log = [
    { date: '2026-05-20', reviewed: 0, saved: 3 },
    { date: '2026-05-21', reviewed: 5, saved: 0 },
  ];
  const r = computeStreak(log, '2026-05-21');
  assert.equal(r.current, 1);
});

test('recordActivity: creates new entry', () => {
  const log = recordActivity([], 'review', '2026-05-21');
  assert.equal(log.length, 1);
  assert.equal(log[0].reviewed, 1);
  assert.equal(log[0].saved, 0);
});

test('recordActivity: increments existing entry', () => {
  const existing = [{ date: '2026-05-21', reviewed: 3, saved: 1 }];
  const log = recordActivity(existing, 'save', '2026-05-21');
  assert.equal(log[0].saved, 2);
  assert.equal(log[0].reviewed, 3);
});

test('heatmapData: returns correct number of days', () => {
  const data = heatmapData([], 2, '2026-05-21');
  assert.equal(data.length, 14);
  assert.equal(data[data.length - 1].date, '2026-05-21');
});
