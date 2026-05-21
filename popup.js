'use strict';
document.addEventListener('DOMContentLoaded', async () => {
  const esc = TTT.util.escapeHtml;
  const storage = await browser.storage.local.get(null);
  const settings = TTT.settings.withDefaults(storage.settings);
  let words = storage.words || [];
  let history = storage.history || [];
  let reviewLog = storage.reviewLog || [];
  let decks = storage.decks || [];

  TTT.i18n.setLocale(settings.locale);

  // Theme
  function applyTheme() {
    const t = settings.theme === 'auto' ? (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light') : settings.theme;
    document.documentElement.setAttribute('data-theme', t);
    document.getElementById('theme-toggle').textContent = t === 'dark' ? '☀️' : '🌙';
  }
  applyTheme();
  document.getElementById('theme-toggle').addEventListener('click', async () => {
    settings.theme = settings.theme === 'dark' ? 'light' : (settings.theme === 'light' ? 'auto' : 'dark');
    applyTheme();
    await browser.storage.local.set({ settings });
  });

  // Fullscreen
  if (new URLSearchParams(location.search).has('fullscreen')) document.body.classList.add('fullscreen');
  document.getElementById('fullscreen-btn').addEventListener('click', () => {
    browser.tabs.create({ url: browser.runtime.getURL('popup.html?fullscreen=1') });
  });

  // Tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('panel-' + tab.dataset.panel).classList.add('active');
    });
  });

  renderWords();
  renderFlashcard();
  renderQuiz();
  renderHistory();
  renderStats();
  renderSettings();

  // ===== WORDS (search, sort, bulk, tags) =====
  function renderWords() {
    const panel = document.getElementById('panel-words');
    if (!words.length) { panel.innerHTML = '<div class="empty-state">No words saved yet.<br>Click English words on web pages to translate and save.</div>'; return; }

    let filter = 'all', search = '', sort = 'date-desc', selected = new Set(), tagFilter = '';

    function render() {
      let filtered = words;
      if (filter !== 'all') filtered = filtered.filter(w => w.level === filter);
      if (tagFilter) filtered = filtered.filter(w => (w.tags || []).includes(tagFilter));
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(w => w.text.toLowerCase().includes(q) || w.translation.toLowerCase().includes(q) || (w.note || '').toLowerCase().includes(q) || (w.tags || []).some(t => t.includes(q)));
      }
      filtered = sortWords(filtered, sort);

      const allTags = [...new Set(words.flatMap(w => w.tags || []))];

      panel.innerHTML = `
        <div class="words-toolbar">
          <input type="search" id="word-search" placeholder="Search..." value="${esc(search)}">
          <select id="word-sort"><option value="date-desc">Newest</option><option value="date-asc">Oldest</option><option value="alpha">A-Z</option><option value="review">Next review</option><option value="level">Level</option></select>
        </div>
        <div class="filters">
          <button class="filter-btn ${filter==='all'?'active':''}" data-f="all">All (${words.length})</button>
          <button class="filter-btn ${filter==='learning'?'active':''}" data-f="learning">Learning</button>
          <button class="filter-btn ${filter==='hard'?'active':''}" data-f="hard">Hard</button>
          <button class="filter-btn ${filter==='mastered'?'active':''}" data-f="mastered">Mastered</button>
          ${allTags.map(t => `<button class="filter-btn ${tagFilter===t?'active':''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}
        </div>
        <div class="bulk-bar ${selected.size?'show':''}">
          <span>${selected.size} selected</span>
          <button id="bulk-del">Delete</button>
          <button id="bulk-level" data-l="mastered">→ Mastered</button>
          <button id="bulk-export">Export</button>
          <button id="bulk-deselect">✕</button>
        </div>
        <div>${filtered.map((w, fi) => {
          const idx = words.indexOf(w);
          const nextR = getReviewLabel(w);
          return `<div class="word-card">
            <div class="word-card-top">
              <div><input type="checkbox" class="word-check" data-i="${idx}" ${selected.has(idx)?'checked':''}><span class="word-en">${esc(w.text)}</span><span class="word-phonetic">${esc(w.phonetic)}</span></div>
              <button class="word-del" data-i="${idx}">×</button>
            </div>
            <div class="word-vi">${esc(w.translation)}</div>
            ${w.sentences&&w.sentences[0]?`<div class="word-sentence">"${esc(w.sentences[0].text)}"</div>`:''}
            <div class="word-tags">${(w.tags||[]).map(t=>`<span class="tag-chip">${esc(t)}</span>`).join('')}<button class="tag-add" data-i="${idx}">+tag</button></div>
            <div class="word-review-info">${nextR}</div>
            <div class="word-levels">
              <button class="lvl-btn learning ${w.level==='learning'?'sel':''}" data-i="${idx}" data-l="learning">Learning</button>
              <button class="lvl-btn hard ${w.level==='hard'?'sel':''}" data-i="${idx}" data-l="hard">Hard</button>
              <button class="lvl-btn mastered ${w.level==='mastered'?'sel':''}" data-i="${idx}" data-l="mastered">Mastered</button>
            </div>
            <textarea class="word-note" data-i="${idx}" placeholder="Note...">${esc(w.note||'')}</textarea>
          </div>`;
        }).join('')}</div>`;

      // Events
      panel.querySelector('#word-search').addEventListener('input', e => { search = e.target.value; render(); });
      panel.querySelector('#word-sort').value = sort;
      panel.querySelector('#word-sort').addEventListener('change', e => { sort = e.target.value; render(); });
      panel.querySelectorAll('.filter-btn[data-f]').forEach(b => b.addEventListener('click', () => { filter = b.dataset.f; tagFilter = ''; render(); }));
      panel.querySelectorAll('.filter-btn[data-tag]').forEach(b => b.addEventListener('click', () => { tagFilter = tagFilter === b.dataset.tag ? '' : b.dataset.tag; render(); }));
      panel.querySelectorAll('.word-check').forEach(cb => cb.addEventListener('change', () => { cb.checked ? selected.add(+cb.dataset.i) : selected.delete(+cb.dataset.i); render(); }));
      panel.querySelectorAll('.word-del').forEach(b => b.addEventListener('click', async () => { words.splice(+b.dataset.i, 1); await save(); render(); }));
      panel.querySelectorAll('.lvl-btn').forEach(b => b.addEventListener('click', async () => { words[+b.dataset.i].level = b.dataset.l; await save(); render(); }));
      panel.querySelectorAll('.word-note').forEach(el => el.addEventListener('change', async () => { words[+el.dataset.i].note = el.value; await save(); }));
      panel.querySelectorAll('.tag-add').forEach(b => b.addEventListener('click', () => {
        const tag = prompt('Tag name:');
        if (tag && tag.trim()) { const w = words[+b.dataset.i]; w.tags = w.tags || []; if (!w.tags.includes(tag.trim())) w.tags.push(tag.trim()); save(); render(); }
      }));

      // Bulk
      const bulkDel = panel.querySelector('#bulk-del');
      if (bulkDel) {
        bulkDel.addEventListener('click', async () => { words = words.filter((_, i) => !selected.has(i)); selected.clear(); await save(); render(); });
        panel.querySelector('#bulk-level').addEventListener('click', async () => { selected.forEach(i => { if (words[i]) words[i].level = 'mastered'; }); await save(); render(); });
        panel.querySelector('#bulk-export').addEventListener('click', () => { const sel = [...selected].map(i => words[i]).filter(Boolean); downloadCSV(TTT.csv.exportCSV(sel), 'selected.csv'); });
        panel.querySelector('#bulk-deselect').addEventListener('click', () => { selected.clear(); render(); });
      }
    }
    render();
  }

  function sortWords(arr, sort) {
    const s = arr.slice();
    if (sort === 'date-desc') s.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    else if (sort === 'date-asc') s.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    else if (sort === 'alpha') s.sort((a, b) => a.text.localeCompare(b.text));
    else if (sort === 'review') s.sort((a, b) => (a.srNext || '').localeCompare(b.srNext || ''));
    else if (sort === 'level') { const o = { hard: 0, learning: 1, mastered: 2 }; s.sort((a, b) => (o[a.level] || 1) - (o[b.level] || 1)); }
    return s;
  }

  function getReviewLabel(w) {
    if (w.level === 'mastered') return 'Mastered';
    const diff = Math.ceil((new Date(w.srNext) - new Date()) / 86400000);
    if (diff <= 0) return 'Due now';
    if (diff === 1) return 'Tomorrow';
    return 'In ' + diff + ' days';
  }

  // ===== FLASHCARD =====
  function renderFlashcard() {
    const panel = document.getElementById('panel-flashcard');
    const now = new Date();
    const due = words.filter(w => TTT.sr.isDue(w, now));
    if (!due.length) { panel.innerHTML = '<div class="fc-done"><div class="fc-done-title">All caught up!</div></div>'; return; }

    let idx = 0;
    function showCard() {
      if (idx >= due.length) { panel.innerHTML = '<div class="fc-done"><div class="fc-done-title">Session complete!</div><p>Reviewed ' + due.length + ' cards.</p></div>'; return; }
      const w = due[idx], intervals = TTT.sr.getNextIntervals(w), pct = Math.round(idx / due.length * 100);
      panel.innerHTML = `<div class="fc-container">
        <div class="fc-progress-bar"><div class="fc-progress-fill" style="width:${pct}%"></div></div>
        <div class="fc-card" id="fc-card"><div class="fc-word">${esc(w.text)}</div><div class="fc-hint">Click to reveal</div><div class="fc-answer" id="fc-ans"><div class="fc-vi">${esc(w.translation)}</div></div></div>
        <div class="fc-buttons" id="fc-btns" style="display:none">
          <button class="fc-btn-hard" data-q="hard">Hard (${intervals.hard}d)</button>
          <button class="fc-btn-ok" data-q="ok">OK (${intervals.ok}d)</button>
          <button class="fc-btn-easy" data-q="easy">Easy (${intervals.easy}d)</button>
        </div></div>`;
      panel.querySelector('#fc-card').addEventListener('click', () => {
        panel.querySelector('#fc-ans').classList.add('show');
        panel.querySelector('.fc-hint').style.display = 'none';
        panel.querySelector('#fc-btns').style.display = 'flex';
      });
      panel.querySelectorAll('.fc-buttons button').forEach(b => b.addEventListener('click', async () => {
        const wi = words.indexOf(w);
        const updated = TTT.sr.review(w, b.dataset.q, now);
        Object.assign(words[wi], updated);
        reviewLog = TTT.streak.recordActivity(reviewLog, 'review');
        await browser.storage.local.set({ words, reviewLog });
        idx++; showCard();
      }));
    }
    showCard();
  }

  // ===== QUIZ =====
  function renderQuiz() {
    const panel = document.getElementById('panel-quiz');
    if (words.length < 4) { panel.innerHTML = '<div class="empty-state">Need at least 4 words for quiz.</div>'; return; }
    panel.innerHTML = `<div class="quiz-setup"><p>Test your vocabulary</p><div class="quiz-modes">
      <button class="quiz-start-btn" data-m="mc">Multiple Choice</button>
      <button class="quiz-start-btn" data-m="typing">Typing</button>
      <button class="quiz-start-btn" data-m="cloze">Cloze (sentences)</button>
      ${window.webkitSpeechRecognition || window.SpeechRecognition ? '<button class="quiz-start-btn" data-m="pronun">Pronunciation</button>' : ''}
    </div></div>`;
    panel.querySelectorAll('.quiz-start-btn').forEach(b => b.addEventListener('click', () => startQuiz(b.dataset.m)));
  }

  function startQuiz(mode) {
    const panel = document.getElementById('panel-quiz');
    const pool = TTT.util.shuffle(words.slice());
    const questions = pool.slice(0, Math.min(10, pool.length));
    let qi = 0, score = 0;

    function showQ() {
      if (qi >= questions.length) {
        panel.innerHTML = `<div class="quiz-score"><div class="quiz-score-num">${score}/${questions.length}</div><p>${Math.round(score/questions.length*100)}%</p><button class="quiz-start-btn" id="retry">Again</button></div>`;
        panel.querySelector('#retry').addEventListener('click', () => renderQuiz());
        return;
      }
      const q = questions[qi], pct = Math.round(qi / questions.length * 100);

      if (mode === 'typing') {
        panel.innerHTML = `<div class="quiz-container"><div class="quiz-progress"><div class="quiz-progress-fill" style="width:${pct}%"></div></div>
          <div class="quiz-type">Type the English word</div><div class="quiz-question">${esc(q.translation)}</div>
          <input class="quiz-typing-input" id="typing-in" placeholder="Type answer..." autofocus></div>`;
        panel.querySelector('#typing-in').addEventListener('keydown', e => {
          if (e.key !== 'Enter') return;
          const result = TTT.quiz.gradeTyping(e.target.value, q.text);
          if (result.correct) score++;
          e.target.disabled = true;
          e.target.style.borderColor = result.correct ? 'var(--success)' : 'var(--danger)';
          if (!result.correct || result.typo) e.target.value += ' → ' + q.text;
          setTimeout(() => { qi++; showQ(); }, 1200);
        });
      } else if (mode === 'pronun') {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        panel.innerHTML = `<div class="quiz-container"><div class="quiz-progress"><div class="quiz-progress-fill" style="width:${pct}%"></div></div>
          <div class="quiz-type">Say this word aloud</div><div class="quiz-question">${esc(q.text)}</div>
          <button class="quiz-start-btn" id="speak-btn">🎤 Speak now</button><div id="pronun-result"></div></div>`;
        panel.querySelector('#speak-btn').addEventListener('click', () => {
          const recognition = new SR();
          recognition.lang = 'en-US'; recognition.maxAlternatives = 3;
          recognition.start();
          panel.querySelector('#speak-btn').textContent = 'Listening...';
          recognition.onresult = (ev) => {
            const results = Array.from(ev.results[0]).map(r => r.transcript.toLowerCase().trim());
            const match = results.some(r => TTT.util.levenshtein(r, q.text.toLowerCase()) <= 2);
            if (match) score++;
            panel.querySelector('#pronun-result').innerHTML = match ? '<span style="color:var(--success)">✓ Correct!</span>' : '<span style="color:var(--danger)">✗ Heard: ' + esc(results[0]) + '</span>';
            setTimeout(() => { qi++; showQ(); }, 1500);
          };
          recognition.onerror = () => {
            panel.querySelector('#pronun-result').innerHTML = '<span style="color:var(--danger)">Error - try again</span>';
            setTimeout(() => { qi++; showQ(); }, 1500);
          };
        });
      } else if (mode === 'cloze') {
        const sent = q.sentences && q.sentences[0];
        if (!sent) { qi++; showQ(); return; }
        const cloze = TTT.quiz.makeCloze(sent.text, q.text);
        if (!cloze) { qi++; showQ(); return; }
        const distractors = TTT.distractor.pickDistractors(q, pool, 3);
        const opts = TTT.util.shuffle([q, ...distractors]);
        panel.innerHTML = `<div class="quiz-container"><div class="quiz-progress"><div class="quiz-progress-fill" style="width:${pct}%"></div></div>
          <div class="quiz-type">Fill in the blank</div><div class="quiz-question">${esc(cloze.sentence)}</div>
          <div class="quiz-options">${opts.map(o => `<button class="quiz-opt" data-c="${o.text===q.text}">${esc(o.text)}</button>`).join('')}</div></div>`;
        panel.querySelectorAll('.quiz-opt').forEach(b => b.addEventListener('click', () => {
          panel.querySelectorAll('.quiz-opt').forEach(x => { x.disabled = true; if (x.dataset.c === 'true') x.classList.add('correct'); });
          if (b.dataset.c === 'true') score++; else b.classList.add('wrong');
          setTimeout(() => { qi++; showQ(); }, 1000);
        }, { once: true }));
      } else {
        // Multiple choice
        const distractors = TTT.distractor.pickDistractors(q, pool, 3);
        const opts = TTT.util.shuffle([q, ...distractors]);
        panel.innerHTML = `<div class="quiz-container"><div class="quiz-progress"><div class="quiz-progress-fill" style="width:${pct}%"></div></div>
          <div class="quiz-type">What does this mean?</div><div class="quiz-question">${esc(q.text)}</div>
          <div class="quiz-options">${opts.map(o => `<button class="quiz-opt" data-c="${o.text===q.text}">${esc(o.translation)}</button>`).join('')}</div></div>`;
        panel.querySelectorAll('.quiz-opt').forEach(b => b.addEventListener('click', () => {
          panel.querySelectorAll('.quiz-opt').forEach(x => { x.disabled = true; if (x.dataset.c === 'true') x.classList.add('correct'); });
          if (b.dataset.c === 'true') score++; else b.classList.add('wrong');
          setTimeout(() => { qi++; showQ(); }, 1000);
        }, { once: true }));
      }
    }
    showQ();
  }

  // ===== HISTORY =====
  function renderHistory() {
    const panel = document.getElementById('panel-history');
    if (!history.length) { panel.innerHTML = '<div class="empty-state">No lookup history yet.</div>'; return; }
    panel.innerHTML = history.slice(0, 50).map(h => `<div class="history-item"><div><div class="history-en">${esc(h.text)}</div><div class="history-vi">${esc(h.translation)}</div></div><span class="history-date">${(h.date||'').slice(0,10)}${h.count>1?' <span class="history-count">×'+h.count+'</span>':''}</span></div>`).join('');
  }

  // ===== STATS + HEATMAP =====
  function renderStats() {
    const panel = document.getElementById('panel-stats');
    const today = new Date().toISOString().slice(0, 10);
    const streak = TTT.streak.computeStreak(reviewLog, today);
    const heatmap = TTT.streak.heatmapData(reviewLog, 12, today);
    const dueNow = words.filter(w => TTT.sr.isDue(w)).length;
    const maxCount = Math.max(1, ...heatmap.map(d => d.count));

    panel.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-num">${words.length}</div><div class="stat-label">Total</div></div>
        <div class="stat-card"><div class="stat-num">${dueNow}</div><div class="stat-label">Due</div></div>
        <div class="stat-card"><div class="stat-num">${words.filter(w=>w.level==='mastered').length}</div><div class="stat-label">Mastered</div></div>
        <div class="stat-card"><div class="stat-num">${streak.current}</div><div class="stat-label">Streak</div></div>
      </div>
      <div class="streak-info">Longest streak: ${streak.longest} days</div>
      <div class="heatmap"><svg viewBox="0 0 ${Math.ceil(heatmap.length/7)*13} 91">${heatmap.map((d, i) => {
        const col = Math.floor(i / 7), row = d.dow;
        const intensity = d.count ? Math.min(1, d.count / maxCount) : 0;
        const color = intensity === 0 ? 'var(--border)' : `rgba(37,99,235,${0.2 + intensity * 0.8})`;
        return `<rect x="${col*13}" y="${row*13}" width="11" height="11" rx="2" fill="${color}"><title>${d.date}: ${d.count}</title></rect>`;
      }).join('')}</svg></div>`;
  }

  // ===== SETTINGS =====
  function renderSettings() {
    const panel = document.getElementById('panel-settings');
    panel.innerHTML = `<div class="settings-form">
      <div class="settings-section">Language</div>
      <div class="setting-row"><label>Source</label><select id="s-sl"><option value="en" ${settings.sourceLang==='en'?'selected':''}>English</option><option value="fr" ${settings.sourceLang==='fr'?'selected':''}>French</option><option value="de" ${settings.sourceLang==='de'?'selected':''}>German</option><option value="ja" ${settings.sourceLang==='ja'?'selected':''}>Japanese</option></select></div>
      <div class="setting-row"><label>Target</label><select id="s-tl"><option value="vi" ${settings.targetLang==='vi'?'selected':''}>Vietnamese</option><option value="en" ${settings.targetLang==='en'?'selected':''}>English</option><option value="ja" ${settings.targetLang==='ja'?'selected':''}>Japanese</option><option value="zh" ${settings.targetLang==='zh'?'selected':''}>Chinese</option></select></div>
      <div class="setting-row"><label>UI Language</label><select id="s-locale"><option value="vi" ${settings.locale==='vi'?'selected':''}>Tiếng Việt</option><option value="en" ${settings.locale==='en'?'selected':''}>English</option></select></div>
      <div class="settings-section">Hover</div>
      <div class="setting-row"><label>Hover translate</label><input type="checkbox" id="s-hover" ${settings.hoverMode?'checked':''}></div>
      <div class="setting-row"><label>Delay (ms)</label><input type="range" id="s-delay" min="50" max="1000" step="50" value="${settings.hoverDelayMs}"><span id="s-delay-val">${settings.hoverDelayMs}</span></div>
      <div class="settings-section">TTS</div>
      <div class="setting-row"><label>Rate</label><input type="range" id="s-rate" min="0.5" max="2" step="0.1" value="${settings.tts.rate}"><span id="s-rate-val">${settings.tts.rate}</span></div>
      <div class="settings-section">Display</div>
      <div class="setting-row"><label>Theme</label><select id="s-theme"><option value="auto" ${settings.theme==='auto'?'selected':''}>Auto</option><option value="light" ${settings.theme==='light'?'selected':''}>Light</option><option value="dark" ${settings.theme==='dark'?'selected':''}>Dark</option></select></div>
      <div class="setting-row"><label>Highlight saved words</label><input type="checkbox" id="s-highlight" ${settings.highlightSaved?'checked':''}></div>
      <div class="settings-section">Data</div>
      <div class="import-export-btns">
        <button id="exp-csv">Export CSV</button>
        <button id="exp-tsv">Export Anki TSV</button>
        <button id="exp-json">Export JSON</button>
        <button id="imp-file">Import</button>
        <button id="imp-deck">Import TOEIC deck</button>
        <button id="clear-all">Clear all data</button>
      </div>
      <input type="file" id="imp-input" accept=".csv,.json,.tsv" style="display:none">
    </div>`;

    // Bind settings
    const bind = (id, key, transform) => {
      panel.querySelector(id).addEventListener('change', async (e) => {
        const val = transform ? transform(e.target) : e.target.value;
        setNested(settings, key, val);
        await browser.storage.local.set({ settings });
        applyTheme();
      });
    };
    bind('#s-sl', 'sourceLang'); bind('#s-tl', 'targetLang'); bind('#s-locale', 'locale');
    bind('#s-hover', 'hoverMode', el => el.checked);
    bind('#s-delay', 'hoverDelayMs', el => { document.getElementById('s-delay-val').textContent = el.value; return +el.value; });
    bind('#s-rate', 'tts.rate', el => { document.getElementById('s-rate-val').textContent = el.value; return +el.value; });
    bind('#s-theme', 'theme'); bind('#s-highlight', 'highlightSaved', el => el.checked);

    // Export
    panel.querySelector('#exp-csv').addEventListener('click', () => downloadCSV(TTT.csv.exportCSV(words), 'vocabulary.csv'));
    panel.querySelector('#exp-tsv').addEventListener('click', () => downloadCSV(TTT.csv.exportAnkiTSV(words), 'vocabulary.tsv'));
    panel.querySelector('#exp-json').addEventListener('click', () => downloadCSV(TTT.csv.exportJSON(words), 'vocabulary.json'));

    // Import
    panel.querySelector('#imp-file').addEventListener('click', () => panel.querySelector('#imp-input').click());
    panel.querySelector('#imp-input').addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const text = await file.text();
      let imported;
      try {
        imported = file.name.endsWith('.json') ? TTT.csv.parseJSON(text) : TTT.csv.parseCSV(text);
      } catch (err) { alert('Parse error: ' + err.message); return; }
      let added = 0;
      for (const raw of imported) {
        const v = TTT.csv.validateWord(raw); if (!v) continue;
        const lemma = TTT.lemma.lemmatize(v.text);
        if (words.some(w => w.lemma === lemma)) continue;
        words.push({ ...v, lemma, sentences: [], srNext: new Date().toISOString(), srInterval: 1, srEase: 2.5, srLapses: 0, date: new Date().toISOString(), lastReview: new Date().toISOString() });
        added++;
      }
      await save(); alert('Imported ' + added + ' words.'); renderWords();
    });

    // Import TOEIC deck
    panel.querySelector('#imp-deck').addEventListener('click', async () => {
      try {
        const res = await fetch(browser.runtime.getURL('decks/toeic_basic.json'));
        const data = await res.json();
        let added = 0;
        for (const raw of data) {
          const lemma = TTT.lemma.lemmatize(raw.text);
          if (words.some(w => w.lemma === lemma)) continue;
          words.push({ ...raw, lemma, tags: raw.tags || ['toeic-basic'], sentences: [], level: 'learning', note: '', srNext: new Date().toISOString(), srInterval: 1, srEase: 2.5, srLapses: 0, date: new Date().toISOString(), lastReview: new Date().toISOString() });
          added++;
        }
        await save(); alert('Imported ' + added + ' TOEIC words.'); renderWords();
      } catch (e) { alert('Deck file not found.'); }
    });

    // Clear
    panel.querySelector('#clear-all').addEventListener('click', async () => {
      if (!confirm('Delete ALL data?')) return;
      await browser.storage.local.clear();
      location.reload();
    });
  }

  // ===== HELPERS =====
  async function save() { await browser.storage.local.set({ words }); }

  function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  }

  function setNested(obj, path, val) {
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) { cur = cur[parts[i]] = cur[parts[i]] || {}; }
    cur[parts[parts.length - 1]] = val;
  }
});
