(async () => {
  let r = null;
  // Retry a few times in case storage write is still in progress
  for (let i = 0; i < 10; i++) {
    const data = await browser.storage.local.get('lastResult');
    if (data.lastResult) { r = data.lastResult; break; }
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  const el = document.getElementById('content');

  if (!r) {
    el.innerHTML = '<div class="loading">No translation result found. Please select text and right-click to translate.</div>';
    return;
  }

  let html = `<div><span class="word">${esc(r.text)}</span>`;
  if (r.details?.phonetic) html += `<span class="phonetic">${esc(r.details.phonetic)}</span>`;
  if (r.details?.audio) html += `<button class="audio-btn" id="play-audio">Play</button>`;
  html += `</div>`;
  html += `<div class="translation">${esc(r.translation)}</div>`;

  if (r.details?.meanings) {
    for (const m of r.details.meanings) {
      html += `<div class="pos">${esc(m.partOfSpeech)}</div>`;
      for (const d of m.definitions) {
        html += `<div class="def">${esc(d.definition)}</div>`;
        if (d.example) html += `<div class="example">"${esc(d.example)}"</div>`;
      }
      if (m.synonyms?.length) html += `<div class="syn">Synonyms: ${m.synonyms.map(esc).join(', ')}</div>`;
      if (m.antonyms?.length) html += `<div class="ant">Antonyms: ${m.antonyms.map(esc).join(', ')}</div>`;
    }
  }

  html += `<button class="save-btn" id="save">Save word</button>`;
  el.innerHTML = html;

  document.getElementById('play-audio')?.addEventListener('click', () => {
    new Audio(r.details.audio).play();
  });

  document.getElementById('save').addEventListener('click', async () => {
    await browser.runtime.sendMessage({
      action: 'saveWord',
      data: {
        text: r.text,
        translation: r.translation,
        phonetic: r.details?.phonetic || '',
        synonyms: r.details?.meanings?.flatMap(m => m.synonyms || []) || [],
        antonyms: r.details?.meanings?.flatMap(m => m.antonyms || []) || []
      }
    });
    document.getElementById('save').textContent = 'Saved';
    document.getElementById('save').disabled = true;
  });
})();

function esc(s) { return s ? s.replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c])) : ''; }
