(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else { root.TTT = root.TTT || {}; root.TTT.cache = mod; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function LRUCache(maxSize, ttlMs) {
    this.max = maxSize || 500;
    this.ttl = ttlMs || 14 * 24 * 3600 * 1000;
    this.map = new Map();
  }

  LRUCache.prototype.get = function (key) {
    var entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.ts > this.ttl) { this.map.delete(key); return undefined; }
    // Move to end (most recent)
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  };

  LRUCache.prototype.set = function (key, value) {
    this.map.delete(key);
    this.map.set(key, { value: value, ts: Date.now() });
    if (this.map.size > this.max) {
      var first = this.map.keys().next().value;
      this.map.delete(first);
    }
  };

  LRUCache.prototype.size = function () { return this.map.size; };

  LRUCache.prototype.toJSON = function () {
    var obj = {};
    this.map.forEach(function (v, k) { obj[k] = v; });
    return obj;
  };

  LRUCache.prototype.loadJSON = function (obj) {
    var now = Date.now();
    var keys = Object.keys(obj || {});
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i], entry = obj[k];
      if (entry && entry.ts && (now - entry.ts <= this.ttl)) {
        this.map.set(k, entry);
      }
    }
    // Trim if over max
    while (this.map.size > this.max) {
      var first = this.map.keys().next().value;
      this.map.delete(first);
    }
  };

  return { LRUCache: LRUCache };
});
