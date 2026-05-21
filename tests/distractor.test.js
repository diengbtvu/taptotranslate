'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { pickDistractors } = require('../src/lib/distractor.js');

const pool = [
  { text: 'celebrate', pos: 'verb' },
  { text: 'criticize', pos: 'verb' },
  { text: 'establish', pos: 'verb' },
  { text: 'cat', pos: 'noun' },
  { text: 'dog', pos: 'noun' },
  { text: 'beautiful', pos: 'adjective' },
  { text: 'negotiate', pos: 'verb' },
];

test('pickDistractors: returns n items', () => {
  const target = { text: 'negotiate', pos: 'verb' };
  const d = pickDistractors(target, pool, 3);
  assert.equal(d.length, 3);
});

test('pickDistractors: excludes target', () => {
  const target = { text: 'negotiate', pos: 'verb' };
  const d = pickDistractors(target, pool, 3);
  assert.ok(d.every(w => w.text !== 'negotiate'));
});

test('pickDistractors: prefers same POS', () => {
  const target = { text: 'negotiate', pos: 'verb' };
  const d = pickDistractors(target, pool, 3);
  // At least 2 should be verbs (pool has 3 other verbs)
  const verbs = d.filter(w => w.pos === 'verb');
  assert.ok(verbs.length >= 2);
});

test('pickDistractors: handles small pool', () => {
  const target = { text: 'cat', pos: 'noun' };
  const small = [{ text: 'dog', pos: 'noun' }];
  const d = pickDistractors(target, small, 3);
  assert.equal(d.length, 1); // only 1 available
});
