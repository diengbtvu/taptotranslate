'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { lemmatize } = require('../src/lib/lemma.js');

test('lemmatize: irregular verbs', () => {
  assert.equal(lemmatize('went'), 'go');
  assert.equal(lemmatize('ran'), 'run');
  assert.equal(lemmatize('taken'), 'take');
  assert.equal(lemmatize('children'), 'child');
});

test('lemmatize: -ies → -y', () => {
  assert.equal(lemmatize('studies'), 'study');
  assert.equal(lemmatize('carries'), 'carry');
});

test('lemmatize: -ied → -y', () => {
  assert.equal(lemmatize('studied'), 'study');
  assert.equal(lemmatize('carried'), 'carry');
});

test('lemmatize: doubled consonant + ing', () => {
  assert.equal(lemmatize('running'), 'run');
  assert.equal(lemmatize('hopping'), 'hop');
  assert.equal(lemmatize('sitting'), 'sit');
});

test('lemmatize: doubled consonant + ed', () => {
  assert.equal(lemmatize('hopped'), 'hop');
  assert.equal(lemmatize('stopped'), 'stop');
});

test('lemmatize: -ing removal with e restoration', () => {
  assert.equal(lemmatize('making'), 'make');
  assert.equal(lemmatize('baking'), 'bake');
});

test('lemmatize: -ed removal', () => {
  assert.equal(lemmatize('baked'), 'bake');
  assert.equal(lemmatize('placed'), 'place');
});

test('lemmatize: -es removal', () => {
  assert.equal(lemmatize('boxes'), 'box');
  assert.equal(lemmatize('places'), 'place');
});

test('lemmatize: -s removal', () => {
  assert.equal(lemmatize('runs'), 'run');
  assert.equal(lemmatize('cats'), 'cat');
});

test('lemmatize: short words unchanged', () => {
  assert.equal(lemmatize('go'), 'go');
  assert.equal(lemmatize('be'), 'be');
});

test('lemmatize: already base form', () => {
  assert.equal(lemmatize('negotiate'), 'negotiate');
  assert.equal(lemmatize('run'), 'run');
});
