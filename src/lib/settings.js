(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else { root.TTT = root.TTT || {}; root.TTT.settings = mod; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var DEFAULTS = {
    sourceLang: 'en',
    targetLang: 'vi',
    hoverMode: true,
    hoverDelayMs: 250,
    fontSize: 'medium',
    theme: 'auto',
    locale: 'vi',
    tts: { rate: 1.0, voice: '' },
    dailyReviewAlarm: true,
    dailyReviewHour: 9,
    highlightSaved: false
  };

  function withDefaults(partial) {
    var s = {};
    var keys = Object.keys(DEFAULTS);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (partial && partial[k] !== undefined) {
        if (k === 'tts' && typeof partial[k] === 'object') {
          s[k] = { rate: partial[k].rate || DEFAULTS.tts.rate, voice: partial[k].voice || DEFAULTS.tts.voice };
        } else {
          s[k] = partial[k];
        }
      } else {
        s[k] = typeof DEFAULTS[k] === 'object' ? JSON.parse(JSON.stringify(DEFAULTS[k])) : DEFAULTS[k];
      }
    }
    return s;
  }

  // Migrate v1 storage to v2 schema. Returns patched storage object.
  function migrateV1toV2(storage, lemmatizeFn) {
    if (storage.schema_version >= 2) return storage;

    var settings = withDefaults(storage.settings);
    if (storage.hoverMode !== undefined) {
      settings.hoverMode = storage.hoverMode !== false;
    }

    var words = (storage.words || []).map(function (w) {
      return {
        text: w.text || '',
        lemma: lemmatizeFn ? lemmatizeFn((w.text || '').toLowerCase()) : (w.text || '').toLowerCase(),
        translation: w.translation || '',
        phonetic: w.phonetic || '',
        audio: w.audio || '',
        pos: w.pos || '',
        synonyms: w.synonyms || [],
        antonyms: w.antonyms || [],
        note: w.note || '',
        tags: w.tags || [],
        sentences: w.sentences || [],
        level: w.level || 'learning',
        srNext: w.srNext || new Date().toISOString(),
        srInterval: w.srInterval || 1,
        srEase: w.srEase || 2.5,
        srLapses: w.srLapses || 0,
        date: w.date || new Date().toISOString(),
        lastReview: w.lastReview || w.date || new Date().toISOString()
      };
    });

    var history = (storage.history || []).map(function (h) {
      return {
        text: h.text || '',
        translation: h.translation || '',
        sl: h.sl || 'en',
        tl: h.tl || 'vi',
        date: h.date || new Date().toISOString(),
        count: h.count || 1
      };
    });

    return {
      schema_version: 2,
      settings: settings,
      words: words,
      history: history,
      decks: storage.decks || [],
      translateCache: storage.translateCache || {},
      reviewLog: storage.reviewLog || [],
      lastResult: storage.lastResult || null
    };
  }

  return { DEFAULTS: DEFAULTS, withDefaults: withDefaults, migrateV1toV2: migrateV1toV2 };
});
