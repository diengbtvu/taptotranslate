'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { t, setLocale, getLocale } = require('../src/lib/i18n.js');

test('i18n: default locale is vi', () => {
  setLocale('vi');
  assert.equal(getLocale(), 'vi');
  assert.equal(t('save'), 'Lưu từ');
});

test('i18n: switch to en', () => {
  setLocale('en');
  assert.equal(t('save'), 'Save word');
  assert.equal(t('words'), 'Words');
});

test('i18n: parameter substitution', () => {
  setLocale('vi');
  assert.equal(t('inDays', { n: 3 }), 'Sau 3 ngày');
  setLocale('en');
  assert.equal(t('inDays', { n: 5 }), 'In 5 days');
});

test('i18n: unknown key returns key itself', () => {
  assert.equal(t('nonExistentKey'), 'nonExistentKey');
});

test('i18n: invalid locale falls back to vi', () => {
  setLocale('xx');
  assert.equal(getLocale(), 'vi');
});
