'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { debounce, escapeHtml, levenshtein, shuffle } = require('../src/lib/util.js');

test('escapeHtml: escapes all dangerous chars', () => {
  assert.equal(escapeHtml('<b>"a" & \'c\'</b>'), '&lt;b&gt;&quot;a&quot; &amp; &#39;c&#39;&lt;/b&gt;');
});

test('escapeHtml: returns empty string for falsy', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(''), '');
});

test('levenshtein: identical strings', () => {
  assert.equal(levenshtein('abc', 'abc'), 0);
});

test('levenshtein: one char diff', () => {
  assert.equal(levenshtein('negotiate', 'negotaite'), 2);
  assert.equal(levenshtein('cat', 'bat'), 1);
});

test('levenshtein: empty strings', () => {
  assert.equal(levenshtein('', 'abc'), 3);
  assert.equal(levenshtein('abc', ''), 3);
});

test('shuffle: returns same length, same elements', () => {
  const arr = [1,2,3,4,5];
  const s = shuffle(arr);
  assert.equal(s.length, 5);
  assert.deepEqual(s.sort(), [1,2,3,4,5]);
  // Original not mutated
  assert.deepEqual(arr, [1,2,3,4,5]);
});

test('debounce: calls after delay', async () => {
  let called = 0;
  const fn = debounce(() => { called++; }, 20);
  fn(); fn(); fn();
  assert.equal(called, 0);
  await new Promise(r => setTimeout(r, 40));
  assert.equal(called, 1);
});

test('debounce: cancel prevents call', async () => {
  let called = 0;
  const fn = debounce(() => { called++; }, 20);
  fn();
  fn.cancel();
  await new Promise(r => setTimeout(r, 40));
  assert.equal(called, 0);
});
