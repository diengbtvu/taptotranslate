// Smoke test for the test harness itself: ensures node:test runs and the
// browser mock behaves as documented before we depend on it elsewhere.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createBrowserMock, installGlobalBrowserMock } = require('./_mock_browser.js');

test('createBrowserMock: storage.local.get with string key', async () => {
  const b = createBrowserMock({ words: [{ text: 'a' }] });
  const out = await b.storage.local.get('words');
  assert.deepEqual(out, { words: [{ text: 'a' }] });
});

test('createBrowserMock: storage.local.get with defaults object', async () => {
  const b = createBrowserMock({});
  const out = await b.storage.local.get({ hoverMode: true, words: [] });
  assert.equal(out.hoverMode, true);
  assert.deepEqual(out.words, []);
});

test('createBrowserMock: storage.local.set fires onChanged', async () => {
  const b = createBrowserMock({});
  let captured = null;
  b.storage.onChanged.addListener((changes) => { captured = changes; });
  await b.storage.local.set({ words: [1, 2, 3] });
  assert.ok(captured);
  assert.deepEqual(captured.words.newValue, [1, 2, 3]);
  assert.equal(captured.words.oldValue, undefined);
});

test('createBrowserMock: deep clone on read so mutations do not leak', async () => {
  const b = createBrowserMock({ words: [{ text: 'a' }] });
  const a = await b.storage.local.get('words');
  a.words[0].text = 'mutated';
  const b2 = await b.storage.local.get('words');
  assert.equal(b2.words[0].text, 'a');
});

test('installGlobalBrowserMock: places browser on globalThis', () => {
  const prev = globalThis.browser;
  const b = installGlobalBrowserMock({ flag: true });
  assert.equal(globalThis.browser, b);
  globalThis.browser = prev;
});
