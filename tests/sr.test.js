'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { review, isDue, getNextIntervals } = require('../src/lib/sr.js');

test('review: hard resets interval to 1, decreases ease', () => {
  const w = { srInterval: 5, srEase: 2.5, srLapses: 0 };
  const now = new Date('2026-05-21T10:00:00Z');
  const r = review(w, 'hard', now);
  assert.equal(r.srInterval, 1);
  assert.equal(r.srEase, 2.2);
  assert.equal(r.srLapses, 1);
  assert.equal(r.srNext, new Date('2026-05-22T10:00:00Z').toISOString());
});

test('review: ok multiplies interval by ease', () => {
  const w = { srInterval: 3, srEase: 2.5, srLapses: 0 };
  const now = new Date('2026-05-21T10:00:00Z');
  const r = review(w, 'ok', now);
  assert.equal(r.srInterval, 8); // ceil(3*2.5)
  assert.equal(r.srEase, 2.5);
});

test('review: easy multiplies interval by ease*1.3, increases ease', () => {
  const w = { srInterval: 3, srEase: 2.5, srLapses: 0 };
  const now = new Date('2026-05-21T10:00:00Z');
  const r = review(w, 'easy', now);
  assert.equal(r.srInterval, 10); // ceil(3*2.5*1.3)
  assert.equal(r.srEase, 2.6);
});

test('review: ease does not go below 1.3', () => {
  const w = { srInterval: 1, srEase: 1.4, srLapses: 0 };
  const r = review(w, 'hard');
  assert.equal(r.srEase, 1.3);
});

test('isDue: returns true when srNext is past', () => {
  const w = { level: 'learning', srNext: '2026-05-20T00:00:00Z' };
  assert.equal(isDue(w, new Date('2026-05-21T00:00:00Z')), true);
});

test('isDue: returns false for mastered', () => {
  const w = { level: 'mastered', srNext: '2020-01-01T00:00:00Z' };
  assert.equal(isDue(w, new Date('2026-05-21T00:00:00Z')), false);
});

test('getNextIntervals: computes correctly', () => {
  const w = { srInterval: 4, srEase: 2.0 };
  const r = getNextIntervals(w);
  assert.equal(r.hard, 1);
  assert.equal(r.ok, 8);
  assert.equal(r.easy, 11); // ceil(4*2.0*1.3)
});
