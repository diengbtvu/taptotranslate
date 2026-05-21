'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { addToHistory } = require('../src/lib/history.js');

test('addToHistory: adds new entry', () => {
  const h = addToHistory([], { text: 'run', translation: 'chạy' }, new Date('2026-05-21T10:00:00Z'));
  assert.equal(h.length, 1);
  assert.equal(h[0].text, 'run');
  assert.equal(h[0].count, 1);
});

test('addToHistory: dedup within 24h increments count', () => {
  const existing = [{ text: 'run', translation: 'chạy', sl: 'en', tl: 'vi', date: '2026-05-21T08:00:00Z', count: 1 }];
  const h = addToHistory(existing, { text: 'Run', translation: 'chạy' }, new Date('2026-05-21T10:00:00Z'));
  assert.equal(h.length, 1);
  assert.equal(h[0].count, 2);
  assert.equal(h[0].date, '2026-05-21T10:00:00.000Z');
});

test('addToHistory: creates new entry if > 24h apart', () => {
  const existing = [{ text: 'run', translation: 'chạy', sl: 'en', tl: 'vi', date: '2026-05-19T08:00:00Z', count: 1 }];
  const h = addToHistory(existing, { text: 'run', translation: 'chạy' }, new Date('2026-05-21T10:00:00Z'));
  assert.equal(h.length, 2);
  assert.equal(h[0].count, 1); // new one at front
});

test('addToHistory: caps at 200', () => {
  const existing = Array.from({ length: 200 }, (_, i) => ({ text: 'w' + i, translation: 't', sl: 'en', tl: 'vi', date: '2026-05-21T00:00:00Z', count: 1 }));
  const h = addToHistory(existing, { text: 'new', translation: 'mới' }, new Date('2026-05-21T10:00:00Z'));
  assert.equal(h.length, 200);
  assert.equal(h[0].text, 'new');
});

test('addToHistory: does not mutate input', () => {
  const existing = [{ text: 'run', translation: 'chạy', sl: 'en', tl: 'vi', date: '2026-05-21T08:00:00Z', count: 1 }];
  addToHistory(existing, { text: 'run', translation: 'chạy' }, new Date('2026-05-21T10:00:00Z'));
  assert.equal(existing[0].count, 1); // unchanged
});
