'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULTS, withDefaults, migrateV1toV2 } = require('../src/lib/settings.js');

test('withDefaults: fills missing fields', () => {
  const s = withDefaults({});
  assert.equal(s.sourceLang, 'en');
  assert.equal(s.hoverDelayMs, 250);
  assert.deepEqual(s.tts, { rate: 1.0, voice: '' });
});

test('withDefaults: preserves provided values', () => {
  const s = withDefaults({ targetLang: 'ja', hoverDelayMs: 500 });
  assert.equal(s.targetLang, 'ja');
  assert.equal(s.hoverDelayMs, 500);
  assert.equal(s.sourceLang, 'en'); // default
});

test('migrateV1toV2: converts old storage', () => {
  const old = {
    hoverMode: false,
    words: [{ text: 'Run', translation: 'chạy', phonetic: '/rʌn/', level: 'learning', srNext: '2026-05-22T00:00:00Z', srInterval: 1, srEase: 2.5, date: '2026-05-21T00:00:00Z' }],
    history: [{ text: 'run', translation: 'chạy', date: '2026-05-21T00:00:00Z' }]
  };
  const result = migrateV1toV2(old, (w) => w);
  assert.equal(result.schema_version, 2);
  assert.equal(result.settings.hoverMode, false);
  assert.equal(result.words[0].lemma, 'run');
  assert.deepEqual(result.words[0].tags, []);
  assert.equal(result.history[0].sl, 'en');
  assert.equal(result.history[0].count, 1);
});

test('migrateV1toV2: no-op if already v2', () => {
  const v2 = { schema_version: 2, settings: { sourceLang: 'en' }, words: [], history: [] };
  const result = migrateV1toV2(v2);
  assert.equal(result, v2); // same reference
});
