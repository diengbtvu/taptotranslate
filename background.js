/* background.js — Tap to Translate v3
 * Uses: TTT.cache, TTT.history, TTT.settings, TTT.lemma, TTT.sr, TTT.streak
 */
'use strict';

// === INIT ===
var translateCache;
var settingsObj;
var cacheWriteTimer = null;

(async function init() {
  var storage = await browser.storage.local.get(null);

  // Migration v1 → v2
  if (!storage.schema_version || storage.schema_version < 2) {
    var lemmatizeFn = (typeof TTT !== 'undefined' && TTT.lemma) ? TTT.lemma.lemmatize : function (w) { return w.toLowerCase(); };
    storage = TTT.settings.migrateV1toV2(storage, lemmatizeFn);
    await browser.storage.local.set(storage);
  }

  settingsObj = TTT.settings.withDefaults(storage.settings);

  // Load persistent cache
  translateCache = new TTT.cache.LRUCache(500, 14 * 24 * 3600 * 1000);
  if (storage.translateCache) translateCache.loadJSON(storage.translateCache);

  // Setup daily review alarm
  setupAlarm();
})();

// === CONTEXT MENU ===
browser.menus.create({ id: 'ttt-translate', title: 'Translate "%s"', contexts: ['selection'] });
browser.menus.create({ id: 'ttt-reading', title: 'Reading mode', contexts: ['selection'] });

browser.menus.onClicked.addListener(async function (info, tab) {
  if (info.menuItemId === 'ttt-translate' && info.selectionText) {
    var result = await handleTranslate(info.selectionText.trim());
    if (result && !result.error) {
      await browser.storage.local.set({ lastResult: result });
      await browser.tabs.create({ url: browser.runtime.getURL('result.html') });
    }
  }
  if (info.menuItemId === 'ttt-reading' && info.selectionText) {
    await browser.storage.local.set({ readingText: info.selectionText });
    await browser.tabs.create({ url: browser.runtime.getURL('reading.html') });
  }
});

// === MESSAGE HANDLER ===
browser.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.action === 'translate') {
    handleTranslate(msg.text).then(sendResponse);
    return true;
  }
  if (msg.action === 'saveWord') {
    saveWord(msg.data).then(sendResponse);
    return true;
  }
  if (msg.action === 'getSettings') {
    sendResponse(settingsObj);
    return false;
  }
});

// === COMMANDS API ===
if (browser.commands && browser.commands.onCommand) {
  browser.commands.onCommand.addListener(async function (command) {
    if (command === 'translate-selection') {
      var tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) browser.tabs.sendMessage(tabs[0].id, { action: 'translateSelection' });
    }
    if (command === 'toggle-hover') {
      settingsObj.hoverMode = !settingsObj.hoverMode;
      await browser.storage.local.set({ settings: settingsObj });
      var tabs = await browser.tabs.query({});
      for (var t of tabs) {
        try { browser.tabs.sendMessage(t.id, { action: 'toggleHover' }); } catch (e) {}
      }
    }
  });
}

// === TRANSLATE ===
async function handleTranslate(text) {
  var sl = settingsObj.sourceLang || 'en';
  var tl = settingsObj.targetLang || 'vi';
  var cacheKey = sl + '|' + tl + '|' + text.toLowerCase().trim();

  var cached = translateCache.get(cacheKey);
  if (cached) return cached;

  var isWord = text.trim().split(/\s+/).length === 1;
  var results = { text: text, translation: '', details: null, error: null };

  // Translate with timeout + retry
  var translated = await fetchWithRetry(
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=' + sl + '&tl=' + tl + '&dt=t&q=' + encodeURIComponent(text),
    { timeout: 6000, retries: 1 }
  );

  if (!translated.ok) {
    return { text: text, translation: '', details: null, error: 'Network error, try again' };
  }

  try {
    var data = await translated.response.json();
    results.translation = data[0].map(function (s) { return s[0]; }).join('');
  } catch (e) {
    return { text: text, translation: '', details: null, error: 'Translation error' };
  }

  // Dictionary details (optional, don't fail on this)
  if (isWord) {
    var wordLower = text.trim().toLowerCase();
    try {
      var dictRes = await fetchWithRetry(
        'https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(wordLower),
        { timeout: 6000, retries: 0 }
      );
      if (dictRes.ok) {
        var dictData = await dictRes.response.json();
        var entry = dictData[0];
        results.details = {
          phonetic: entry.phonetic || (entry.phonetics && entry.phonetics.find(function (p) { return p.text; }) || {}).text || '',
          audio: (entry.phonetics && entry.phonetics.find(function (p) { return p.audio; }) || {}).audio || '',
          meanings: entry.meanings.map(function (m) {
            return {
              partOfSpeech: m.partOfSpeech,
              definitions: m.definitions.slice(0, 2).map(function (d) { return { definition: d.definition, example: d.example || '' }; }),
              synonyms: (m.synonyms || []).slice(0, 5),
              antonyms: (m.antonyms || []).slice(0, 5)
            };
          })
        };
      }
    } catch (e) { /* dictionary fail is non-fatal */ }
  }

  // Cache + history (only if translation succeeded)
  translateCache.set(cacheKey, results);
  scheduleCacheWrite();

  // History with dedup
  var storage = await browser.storage.local.get('history');
  var history = TTT.history.addToHistory(storage.history || [], { text: text, translation: results.translation, sl: sl, tl: tl }, new Date());
  await browser.storage.local.set({ history: history });

  return results;
}

// === SAVE WORD ===
async function saveWord(data) {
  var storage = await browser.storage.local.get(['words', 'reviewLog']);
  var words = storage.words || [];
  var lemma = (typeof TTT !== 'undefined' && TTT.lemma) ? TTT.lemma.lemmatize(data.text) : data.text.toLowerCase();

  // Check if lemma already exists
  var existing = words.find(function (w) { return w.lemma === lemma; });
  if (existing) {
    // Update: add sentence, merge tags
    if (data.sentence && existing.sentences.length < 5) {
      var hasSentence = existing.sentences.some(function (s) { return s.text === data.sentence; });
      if (!hasSentence) existing.sentences.push({ text: data.sentence, url: '', date: new Date().toISOString().slice(0, 10) });
    }
    await browser.storage.local.set({ words: words });
    return { success: true, merged: true };
  }

  words.push({
    text: data.text,
    lemma: lemma,
    translation: data.translation || '',
    phonetic: data.phonetic || '',
    audio: data.audio || '',
    pos: data.pos || '',
    synonyms: data.synonyms || [],
    antonyms: data.antonyms || [],
    note: '',
    tags: [],
    sentences: data.sentence ? [{ text: data.sentence, url: '', date: new Date().toISOString().slice(0, 10) }] : [],
    level: 'learning',
    srNext: new Date().toISOString(),
    srInterval: 1,
    srEase: 2.5,
    srLapses: 0,
    date: new Date().toISOString(),
    lastReview: new Date().toISOString()
  });
  await browser.storage.local.set({ words: words });

  // Record activity
  var reviewLog = TTT.streak.recordActivity(storage.reviewLog || [], 'save');
  await browser.storage.local.set({ reviewLog: reviewLog });

  return { success: true, merged: false };
}

// === FETCH WITH TIMEOUT + RETRY ===
async function fetchWithRetry(url, opts) {
  var timeout = (opts && opts.timeout) || 6000;
  var retries = (opts && opts.retries !== undefined) ? opts.retries : 1;

  for (var attempt = 0; attempt <= retries; attempt++) {
    try {
      var controller = new AbortController();
      var timer = setTimeout(function () { controller.abort(); }, timeout);
      var response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (response.ok) return { ok: true, response: response };
      if (attempt >= retries) return { ok: false, status: response.status };
    } catch (e) {
      if (attempt >= retries) return { ok: false, error: e.message };
    }
  }
  return { ok: false };
}

// === CACHE PERSISTENCE ===
function scheduleCacheWrite() {
  if (cacheWriteTimer) return;
  cacheWriteTimer = setTimeout(async function () {
    cacheWriteTimer = null;
    await browser.storage.local.set({ translateCache: translateCache.toJSON() });
  }, 2000);
}

// === DAILY REVIEW ALARM ===
function setupAlarm() {
  if (!browser.alarms) return;
  browser.alarms.create('daily-review', { periodInMinutes: 1440 });
}

if (browser.alarms && browser.alarms.onAlarm) {
  browser.alarms.onAlarm.addListener(async function (alarm) {
    if (alarm.name !== 'daily-review') return;
    var storage = await browser.storage.local.get('words');
    var words = storage.words || [];
    var now = new Date();
    var dueCount = words.filter(function (w) { return TTT.sr.isDue(w, now); }).length;
    if (dueCount > 0) {
      browser.browserAction.setBadgeText({ text: String(dueCount) });
      browser.browserAction.setBadgeBackgroundColor({ color: '#2563eb' });
      if (browser.notifications) {
        browser.notifications.create('review-reminder', {
          type: 'basic',
          title: 'Tap to Translate',
          message: dueCount + ' words due for review!'
        });
      }
    } else {
      browser.browserAction.setBadgeText({ text: '' });
    }
  });
}

// Listen for settings changes
browser.storage.onChanged.addListener(function (changes) {
  if (changes.settings) {
    settingsObj = TTT.settings.withDefaults(changes.settings.newValue);
  }
});
