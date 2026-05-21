'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { LRUCache } = require('../src/lib/cache.js');

test('LRUCache: basic set/get', () => {
  const c = new LRUCache(3);
  c.set('a', 1); c.set('b', 2); c.set('c', 3);
  assert.equal(c.get('a'), 1);
  assert.equal(c.get('b'), 2);
  assert.equal(c.size(), 3);
});

test('LRUCache: evicts oldest when over max', () => {
  const c = new LRUCache(3);
  c.set('a', 1); c.set('b', 2); c.set('c', 3); c.set('d', 4);
  assert.equal(c.get('a'), undefined);
  assert.equal(c.get('d'), 4);
  assert.equal(c.size(), 3);
});

test('LRUCache: get refreshes entry', () => {
  const c = new LRUCache(3);
  c.set('a', 1); c.set('b', 2); c.set('c', 3);
  c.get('a'); // refresh a
  c.set('d', 4); // should evict b (oldest after a refresh)
  assert.equal(c.get('a'), 1);
  assert.equal(c.get('b'), undefined);
});

test('LRUCache: TTL expiry', () => {
  const c = new LRUCache(10, 100); // 100ms TTL
  c.map.set('old', { value: 'x', ts: Date.now() - 200 });
  assert.equal(c.get('old'), undefined);
});

test('LRUCache: toJSON/loadJSON roundtrip', () => {
  const c = new LRUCache(5);
  c.set('a', { text: 'hello' }); c.set('b', { text: 'world' });
  const json = c.toJSON();
  const c2 = new LRUCache(5);
  c2.loadJSON(json);
  assert.deepEqual(c2.get('a'), { text: 'hello' });
  assert.deepEqual(c2.get('b'), { text: 'world' });
});

test('LRUCache: loadJSON skips expired entries', () => {
  const c = new LRUCache(5, 100);
  const json = { old: { value: 'x', ts: Date.now() - 200 }, fresh: { value: 'y', ts: Date.now() } };
  c.loadJSON(json);
  assert.equal(c.get('old'), undefined);
  assert.equal(c.get('fresh'), 'y');
});
