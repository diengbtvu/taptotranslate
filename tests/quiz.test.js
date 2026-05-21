'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { gradeTyping, makeCloze } = require('../src/lib/quiz.js');

test('gradeTyping: exact match', () => {
  const r = gradeTyping('negotiate', 'negotiate');
  assert.equal(r.correct, true);
  assert.equal(r.typo, false);
});

test('gradeTyping: case insensitive', () => {
  const r = gradeTyping('Negotiate', 'negotiate');
  assert.equal(r.correct, true);
});

test('gradeTyping: typo (distance 1)', () => {
  const r = gradeTyping('negotaite', 'negotiate');
  assert.equal(r.correct, true);
  assert.equal(r.typo, true);
});

test('gradeTyping: wrong answer', () => {
  const r = gradeTyping('different', 'negotiate');
  assert.equal(r.correct, false);
});

test('makeCloze: replaces word with blank', () => {
  const r = makeCloze('We need to negotiate the price', 'negotiate');
  assert.equal(r.sentence, 'We need to ____ the price');
  assert.equal(r.blank, 'negotiate');
});

test('makeCloze: case insensitive match', () => {
  const r = makeCloze('Negotiate is important', 'negotiate');
  assert.equal(r.sentence, '____ is important');
});

test('makeCloze: returns null if word not in sentence', () => {
  const r = makeCloze('Hello world', 'negotiate');
  assert.equal(r, null);
});
