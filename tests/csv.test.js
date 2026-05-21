'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { exportAnkiTSV, exportCSV, parseCSV, parseJSON, validateWord } = require('../src/lib/csv.js');

test('exportAnkiTSV: produces tab-separated lines', () => {
  const words = [{ text: 'run', translation: 'chạy', phonetic: '/rʌn/', tags: ['verb'], sentences: [{ text: 'I run daily.' }] }];
  const tsv = exportAnkiTSV(words);
  const parts = tsv.split('\t');
  assert.equal(parts[0], 'run');
  assert.ok(parts[1].includes('chạy'));
  assert.ok(parts[1].includes('/rʌn/'));
  assert.equal(parts[2], 'verb');
});

test('exportCSV: has BOM and header', () => {
  const words = [{ text: 'cat', translation: 'mèo', phonetic: '', level: 'learning', note: '', synonyms: [], antonyms: [], tags: [], srNext: '2026-05-22', date: '2026-05-21' }];
  const csv = exportCSV(words);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('Word,Translation'));
  assert.ok(csv.includes('"cat"'));
});

test('parseCSV: roundtrip with exportCSV', () => {
  const words = [{ text: 'cat', translation: 'mèo', phonetic: '/kæt/', level: 'learning', note: 'cute', synonyms: ['feline'], antonyms: ['dog'], tags: ['animal'], srNext: '2026-05-22', date: '2026-05-21' }];
  const csv = exportCSV(words);
  const parsed = parseCSV(csv);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].Word, 'cat');
  assert.equal(parsed[0].Translation, 'mèo');
});

test('parseJSON: parses array', () => {
  const data = parseJSON('[{"text":"run","translation":"chạy"}]');
  assert.equal(data.length, 1);
  assert.equal(data[0].text, 'run');
});

test('parseJSON: throws on non-array', () => {
  assert.throws(() => parseJSON('{"text":"run"}'), /Expected array/);
});

test('validateWord: normalizes from CSV headers', () => {
  const w = validateWord({ Word: 'run', Translation: 'chạy', Tags: 'verb;toeic' });
  assert.equal(w.text, 'run');
  assert.deepEqual(w.tags, ['verb', 'toeic']);
});

test('validateWord: returns null for empty', () => {
  assert.equal(validateWord({}), null);
  assert.equal(validateWord(null), null);
});
