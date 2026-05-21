(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else { root.TTT = root.TTT || {}; root.TTT.csv = mod; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Export words to Anki-compatible TSV (Front\tBack\tTags)
  function exportAnkiTSV(words) {
    var lines = [];
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      var back = w.translation;
      if (w.phonetic) back += '\n' + w.phonetic;
      if (w.sentences && w.sentences[0]) back += '\n' + w.sentences[0].text;
      var tags = (w.tags || []).join(' ');
      lines.push(w.text + '\t' + back.replace(/\t/g, ' ') + '\t' + tags);
    }
    return lines.join('\n');
  }

  // Export words to CSV with BOM
  function exportCSV(words) {
    var bom = '\uFEFF';
    var header = 'Word,Translation,Phonetic,Level,Note,Synonyms,Antonyms,Tags,NextReview,Date';
    var rows = words.map(function (w) {
      return [w.text, w.translation, w.phonetic, w.level, w.note || '',
        (w.synonyms||[]).join(';'), (w.antonyms||[]).join(';'),
        (w.tags||[]).join(';'), (w.srNext||'').slice(0,10), (w.date||'').slice(0,10)
      ].map(function (v) { return '"' + (v||'').replace(/"/g, '""') + '"'; }).join(',');
    });
    return bom + header + '\n' + rows.join('\n');
  }

  // Export words as JSON string
  function exportJSON(words) {
    return JSON.stringify(words, null, 2);
  }

  // Parse CSV (simple: split by comma respecting quotes)
  function parseCSV(text) {
    var lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (lines.length < 2) return [];
    var headers = parseLine(lines[0]);
    var results = [];
    for (var i = 1; i < lines.length; i++) {
      var vals = parseLine(lines[i]);
      var obj = {};
      for (var j = 0; j < headers.length; j++) obj[headers[j]] = vals[j] || '';
      results.push(obj);
    }
    return results;
  }

  function parseLine(line) {
    var result = [], current = '', inQuote = false;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (c === '"') {
        if (inQuote && line[i+1] === '"') { current += '"'; i++; }
        else inQuote = !inQuote;
      } else if (c === ',' && !inQuote) {
        result.push(current); current = '';
      } else {
        current += c;
      }
    }
    result.push(current);
    return result;
  }

  // Parse JSON import (array of word objects)
  function parseJSON(text) {
    var data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error('Expected array');
    return data;
  }

  // Validate imported word object, return normalized or null
  function validateWord(obj) {
    if (!obj || !obj.text && !obj.Word) return null;
    return {
      text: obj.text || obj.Word || '',
      translation: obj.translation || obj.Translation || '',
      phonetic: obj.phonetic || obj.Phonetic || '',
      level: obj.level || obj.Level || 'learning',
      note: obj.note || obj.Note || '',
      tags: parseTags(obj.tags || obj.Tags),
      synonyms: parseList(obj.synonyms || obj.Synonyms),
      antonyms: parseList(obj.antonyms || obj.Antonyms)
    };
  }

  function parseTags(v) {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') return v.split(';').map(function(s){return s.trim();}).filter(Boolean);
    return [];
  }
  function parseList(v) {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') return v.split(';').map(function(s){return s.trim();}).filter(Boolean);
    return [];
  }

  return {
    exportAnkiTSV: exportAnkiTSV, exportCSV: exportCSV, exportJSON: exportJSON,
    parseCSV: parseCSV, parseJSON: parseJSON, validateWord: validateWord
  };
});
