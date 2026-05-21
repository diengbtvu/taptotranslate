/* content.js — Tap to Translate v3
 * Injected into all pages (all_frames). Uses TTT.util, TTT.lemma, TTT.i18n from src/lib/.
 */
'use strict';
(function () {
  // Skip empty frames
  if (!document.body || !document.body.innerText || document.body.innerText.trim().length === 0) return;

  var esc = (typeof TTT !== 'undefined' && TTT.util) ? TTT.util.escapeHtml : function (s) {
    return s ? s.replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }) : '';
  };

  // === STATE ===
  var popup = null;
  var hoverTooltip = null;
  var hoverTimeout = null;
  var hoverMode = true;
  var hoverDelayMs = 250;
  var lastHoverWord = '';
  var settings = {};

  // Load settings
  browser.storage.local.get(['settings']).then(function (d) {
    settings = (d.settings || {});
    hoverMode = settings.hoverMode !== false;
    hoverDelayMs = settings.hoverDelayMs || 250;
  });

  browser.storage.onChanged.addListener(function (changes) {
    if (changes.settings) {
      settings = changes.settings.newValue || {};
      hoverMode = settings.hoverMode !== false;
      hoverDelayMs = settings.hoverDelayMs || 250;
    }
  });

  // === HOVER TRANSLATE (debounced, cancellable) ===
  var cancelHover = function () {
    clearTimeout(hoverTimeout);
    hoverTimeout = null;
  };

  document.addEventListener('mousemove', function (e) {
    if (!hoverMode || popup) return;
    if (hoverTooltip && hoverTooltip.contains(e.target)) return;

    cancelHover();
    hoverTimeout = setTimeout(function () {
      var word = getWordAtPoint(e.clientX, e.clientY);
      if (!word || word === lastHoverWord) return;
      lastHoverWord = word;
      showHoverTooltip(e.clientX, e.clientY, word);
    }, hoverDelayMs);
  });

  // Cancel hover on scroll, typing, selection start
  document.addEventListener('scroll', function () { cancelHover(); removeHoverTooltip(); }, true);
  document.addEventListener('keydown', function () { cancelHover(); removeHoverTooltip(); });
  document.addEventListener('selectstart', function () { cancelHover(); removeHoverTooltip(); });
  document.addEventListener('mouseout', function (e) {
    if (e.relatedTarget && hoverTooltip && hoverTooltip.contains(e.relatedTarget)) return;
    cancelHover();
  });

  function getWordAtPoint(x, y) {
    if (document.caretRangeFromPoint) {
      var range = document.caretRangeFromPoint(x, y);
      if (range && range.startContainer.nodeType === 3) {
        try { range.expand('word'); var w = range.toString().trim(); if (/^[a-zA-Z]{2,}$/.test(w)) return w; } catch (e) {}
      }
    }
    if (document.caretPositionFromPoint) {
      var pos = document.caretPositionFromPoint(x, y);
      if (pos && pos.offsetNode && pos.offsetNode.nodeType === 3) {
        var text = pos.offsetNode.textContent, offset = pos.offset;
        var start = offset, end = offset;
        while (start > 0 && /[a-zA-Z]/.test(text[start - 1])) start--;
        while (end < text.length && /[a-zA-Z]/.test(text[end])) end++;
        var w = text.slice(start, end).trim();
        if (/^[a-zA-Z]{2,}$/.test(w)) return w;
      }
    }
    return null;
  }

  // === HOVER TOOLTIP (upgraded: POS, phonetic, save button) ===
  async function showHoverTooltip(x, y, word) {
    removeHoverTooltip();
    hoverTooltip = document.createElement('div');
    hoverTooltip.id = 'ttt-hover';
    hoverTooltip.style.pointerEvents = 'auto';
    hoverTooltip.innerHTML = '<span class="ttt-hover-word">' + esc(word) + '</span> <span class="ttt-hover-loading">...</span>';
    hoverTooltip.style.left = Math.min(x, window.innerWidth - 300) + 'px';
    hoverTooltip.style.top = (y + window.scrollY - 44) + 'px';
    document.body.appendChild(hoverTooltip);

    try {
      var result = await browser.runtime.sendMessage({ action: 'translate', text: word });
      if (!hoverTooltip) return;
      var pos = result.details && result.details.meanings && result.details.meanings[0] ? result.details.meanings[0].partOfSpeech : '';
      var phonetic = result.details ? (result.details.phonetic || '') : '';
      var html = '<span class="ttt-hover-word">' + esc(word) + '</span>';
      if (pos) html += ' <span class="ttt-hover-pos">(' + esc(pos) + ')</span>';
      if (phonetic) html += ' <span class="ttt-hover-ph">' + esc(phonetic) + '</span>';
      html += ' <span class="ttt-hover-trans">' + esc(result.translation) + '</span>';
      html += ' <button class="ttt-hover-save" title="Save">💾</button>';
      html += ' <button class="ttt-hover-audio" title="Listen">🔊</button>';
      hoverTooltip.innerHTML = html;

      hoverTooltip.querySelector('.ttt-hover-save').addEventListener('click', function (e) {
        e.stopPropagation();
        browser.runtime.sendMessage({
          action: 'saveWord',
          data: { text: result.text, translation: result.translation, phonetic: phonetic, pos: pos, synonyms: result.details ? result.details.meanings.flatMap(function (m) { return m.synonyms || []; }) : [], antonyms: result.details ? result.details.meanings.flatMap(function (m) { return m.antonyms || []; }) : [], sentence: extractSentence() }
        });
        this.textContent = '✓';
        this.disabled = true;
      });

      hoverTooltip.querySelector('.ttt-hover-audio').addEventListener('click', function (e) {
        e.stopPropagation();
        playTTS(word, result.details && result.details.audio);
      });

      // Click tooltip → open full popup
      hoverTooltip.addEventListener('click', function (e) {
        if (e.target.tagName === 'BUTTON') return;
        removeHoverTooltip();
        showPopup(x, y, word);
      });
    } catch (e) {
      removeHoverTooltip();
    }
  }

  function removeHoverTooltip() {
    if (hoverTooltip) { hoverTooltip.remove(); hoverTooltip = null; }
    lastHoverWord = '';
  }

  // === SELECTION (mouseup) ===
  document.addEventListener('mouseup', function (e) {
    if (popup && popup.contains(e.target)) return;
    if (hoverTooltip && hoverTooltip.contains(e.target)) return;
    setTimeout(function () {
      var selection = window.getSelection().toString().trim();
      if (!selection || !/[a-zA-Z]/.test(selection) || selection.length < 2) return;
      removePopup();
      removeHoverTooltip();
      showPopup(e.clientX, e.clientY, selection);
    }, 10);
  });

  // === DOUBLE-CLICK ===
  document.addEventListener('dblclick', function (e) {
    if (popup && popup.contains(e.target)) return;
    removePopup();
    removeHoverTooltip();
    var selection = window.getSelection().toString().trim();
    if (selection && /[a-zA-Z]/.test(selection)) { showPopup(e.clientX, e.clientY, selection); return; }
    var range = document.caretRangeFromPoint && document.caretRangeFromPoint(e.clientX, e.clientY);
    if (!range) return;
    range.expand('word');
    var text = range.toString().trim();
    if (text && /[a-zA-Z]/.test(text)) showPopup(e.clientX, e.clientY, text);
  });

  // === CLICK DISMISS ===
  document.addEventListener('click', function (e) {
    if (popup && !popup.contains(e.target)) removePopup();
  });

  // === FULL POPUP ===
  async function showPopup(x, y, text) {
    cancelHover();
    removeHoverTooltip();
    popup = document.createElement('div');
    popup.id = 'ttt-popup';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-label', 'Translation popup');
    popup.innerHTML = '<div class="ttt-loading">Translating...</div>';
    positionPopup(popup, x, y);
    document.body.appendChild(popup);

    var result = await browser.runtime.sendMessage({ action: 'translate', text: text });
    if (!popup) return;

    if (!result || result.error) {
      popup.innerHTML = '<div class="ttt-loading">' + esc(result && result.error || 'Network error, try again') + '</div><button class="ttt-close">×</button>';
      popup.querySelector('.ttt-close').addEventListener('click', removePopup);
      return;
    }

    var html = '<div class="ttt-header"><span class="ttt-word">' + esc(result.text) + '</span>';
    if (result.details) {
      html += '<span class="ttt-phonetic">' + esc(result.details.phonetic) + '</span>';
      html += '<button class="ttt-audio" tabindex="0" title="Listen">🔊</button>';
    }
    html += '</div>';
    html += '<div class="ttt-translation">' + esc(result.translation) + '</div>';

    if (result.details && result.details.meanings) {
      var meanings = result.details.meanings;
      html += buildMeaning(meanings[0]);
      if (meanings.length > 1) {
        html += '<div class="ttt-more-wrap" style="display:none">';
        for (var i = 1; i < meanings.length; i++) html += buildMeaning(meanings[i]);
        html += '</div>';
        html += '<button class="ttt-more-btn" tabindex="0">More (' + (meanings.length - 1) + ')</button>';
      }
    }

    html += '<button class="ttt-close" tabindex="0" aria-label="Close">×</button>';
    html += '<button class="ttt-save" tabindex="0">Save word</button>';
    popup.innerHTML = html;

    // Focus save button for keyboard nav
    var saveBtn = popup.querySelector('.ttt-save');
    setTimeout(function () { saveBtn.focus(); }, 50);

    popup.querySelector('.ttt-close').addEventListener('click', function (e) { e.stopPropagation(); removePopup(); });

    popup.querySelector('.ttt-audio').addEventListener('click', function (e) {
      e.stopPropagation();
      playTTS(result.text, result.details && result.details.audio);
    });

    var moreBtn = popup.querySelector('.ttt-more-btn');
    if (moreBtn) moreBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      popup.querySelector('.ttt-more-wrap').style.display = 'block';
      e.target.remove();
    });

    saveBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var pos = result.details && result.details.meanings && result.details.meanings[0] ? result.details.meanings[0].partOfSpeech : '';
      browser.runtime.sendMessage({
        action: 'saveWord',
        data: {
          text: result.text, translation: result.translation,
          phonetic: result.details ? result.details.phonetic : '',
          pos: pos,
          synonyms: result.details ? result.details.meanings.flatMap(function (m) { return m.synonyms || []; }) : [],
          antonyms: result.details ? result.details.meanings.flatMap(function (m) { return m.antonyms || []; }) : [],
          sentence: extractSentence()
        }
      });
      saveBtn.textContent = 'Saved';
      saveBtn.disabled = true;
    });

    // Keyboard nav inside popup
    popup.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { removePopup(); e.stopPropagation(); }
      if (e.key === 'Enter' && document.activeElement === saveBtn && !saveBtn.disabled) {
        saveBtn.click();
      }
    });
  }

  function buildMeaning(m) {
    var h = '<div class="ttt-pos">' + esc(m.partOfSpeech) + '</div>';
    h += '<div class="ttt-def">' + esc(m.definitions[0].definition) + '</div>';
    if (m.definitions[0].example) h += '<div class="ttt-example">"' + esc(m.definitions[0].example) + '"</div>';
    if (m.definitions.length > 1) {
      h += '<div class="ttt-more-defs" style="display:none">';
      for (var i = 1; i < m.definitions.length; i++) {
        h += '<div class="ttt-def">' + esc(m.definitions[i].definition) + '</div>';
        if (m.definitions[i].example) h += '<div class="ttt-example">"' + esc(m.definitions[i].example) + '"</div>';
      }
      h += '</div>';
    }
    if (m.synonyms && m.synonyms.length) h += '<div class="ttt-syn">Syn: ' + m.synonyms.map(esc).join(', ') + '</div>';
    if (m.antonyms && m.antonyms.length) h += '<div class="ttt-ant">Ant: ' + m.antonyms.map(esc).join(', ') + '</div>';
    return h;
  }

  function positionPopup(el, x, y) {
    var left = Math.max(5, Math.min(x, window.innerWidth - 310));
    var top = y + 15;
    if (top + 360 > window.innerHeight) top = Math.max(5, y - 360);
    el.style.left = left + 'px';
    el.style.top = top + 'px';
  }

  function removePopup() { if (popup) { popup.remove(); popup = null; } }

  // === TTS FALLBACK ===
  function playTTS(word, audioUrl) {
    if (audioUrl) {
      var audio = new Audio(audioUrl);
      audio.play().catch(function () { fallbackTTS(word); });
    } else {
      fallbackTTS(word);
    }
  }

  function fallbackTTS(word) {
    if (!window.speechSynthesis) return;
    var utt = new SpeechSynthesisUtterance(word);
    utt.lang = settings.sourceLang || 'en';
    utt.rate = (settings.tts && settings.tts.rate) || 1.0;
    if (settings.tts && settings.tts.voice) {
      var voices = speechSynthesis.getVoices();
      var v = voices.find(function (v) { return v.name === settings.tts.voice; });
      if (v) utt.voice = v;
    }
    speechSynthesis.speak(utt);
  }

  // === SENTENCE MINING ===
  function extractSentence() {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return '';
    var node = sel.anchorNode;
    if (!node) return '';
    var text = (node.nodeType === 3 ? node.parentElement : node).innerText || '';
    // Find sentence containing selection
    var selText = sel.toString().trim();
    var sentences = text.split(/(?<=[.!?])\s+/);
    for (var i = 0; i < sentences.length; i++) {
      if (sentences[i].toLowerCase().includes(selText.toLowerCase())) {
        return sentences[i].trim().slice(0, 200);
      }
    }
    return text.slice(0, 200);
  }

  // === KEYBOARD SHORTCUTS ===
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { removePopup(); removeHoverTooltip(); }
  });

  // === COMMANDS API LISTENER ===
  browser.runtime.onMessage.addListener(function (msg) {
    if (msg.action === 'translateSelection') {
      var sel = window.getSelection().toString().trim();
      if (sel && sel.length >= 2) {
        removePopup(); removeHoverTooltip();
        showPopup(100, window.scrollY + 100, sel);
      }
    }
    if (msg.action === 'toggleHover') {
      hoverMode = !hoverMode;
      if (!hoverMode) removeHoverTooltip();
    }
    if (msg.action === 'showResult' && msg.result) {
      removePopup(); removeHoverTooltip();
      showPopup(100, window.scrollY + 100, msg.result.text);
    }
    if (msg.action === 'highlightWords' && msg.lemmas) {
      highlightSavedWords(msg.lemmas, msg.translations || {});
    }
  });

  // === HIGHLIGHT SAVED WORDS ===
  var highlightActive = false;
  function highlightSavedWords(lemmas, translations) {
    // Remove existing highlights
    document.querySelectorAll('mark.ttt-highlight').forEach(function (m) {
      m.replaceWith(m.textContent);
    });
    if (!lemmas || !lemmas.length) { highlightActive = false; return; }
    highlightActive = true;
    var lemmaSet = new Set(lemmas);
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var p = node.parentElement;
        if (!p || /^(SCRIPT|STYLE|TEXTAREA|INPUT|MARK)$/i.test(p.tagName)) return NodeFilter.FILTER_REJECT;
        if (p.isContentEditable) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [], batch = 0;
    while (walker.nextNode()) { nodes.push(walker.currentNode); }
    function processBatch() {
      var end = Math.min(batch + 200, nodes.length);
      for (var i = batch; i < end; i++) {
        var node = nodes[i], text = node.textContent;
        var re = /\b[a-zA-Z]{2,}\b/g, match, frag = null, lastIdx = 0;
        while ((match = re.exec(text)) !== null) {
          var word = match[0];
          var lemma = (typeof TTT !== 'undefined' && TTT.lemma) ? TTT.lemma.lemmatize(word) : word.toLowerCase();
          if (lemmaSet.has(lemma)) {
            if (!frag) frag = document.createDocumentFragment();
            if (match.index > lastIdx) frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
            var mark = document.createElement('mark');
            mark.className = 'ttt-highlight';
            mark.textContent = word;
            mark.title = translations[lemma] || '';
            frag.appendChild(mark);
            lastIdx = match.index + word.length;
          }
        }
        if (frag) {
          if (lastIdx < text.length) frag.appendChild(document.createTextNode(text.slice(lastIdx)));
          node.parentNode.replaceChild(frag, node);
        }
      }
      batch = end;
      if (batch < nodes.length) requestIdleCallback(processBatch);
    }
    if (typeof requestIdleCallback !== 'undefined') requestIdleCallback(processBatch);
    else setTimeout(processBatch, 0);
  }

  // Check if highlight should be active on load
  browser.storage.local.get(['settings', 'words']).then(function (d) {
    var s = d.settings || {};
    if (s.highlightSaved && d.words && d.words.length) {
      var lemmas = d.words.map(function (w) { return w.lemma; });
      var translations = {};
      d.words.forEach(function (w) { translations[w.lemma] = w.translation; });
      highlightSavedWords(lemmas, translations);
    }
  });
})();
