'use strict';
(async function () {
  const esc = TTT.util.escapeHtml;
  const { readingText } = await browser.storage.local.get('readingText');
  const el = document.getElementById('content');
  if (!readingText) { el.textContent = 'No text selected.'; return; }

  // Split into sentences
  const sentences = readingText.split(/(?<=[.!?])\s+/).filter(s => s.trim());

  sentences.forEach(sent => {
    const div = document.createElement('div');
    div.className = 'sentence';
    // Wrap each word in a span
    div.innerHTML = sent.replace(/\b([a-zA-Z]{2,})\b/g, '<span class="word">$1</span>');
    el.appendChild(div);
  });

  // Click word → tooltip with translation
  let tooltip = null;
  el.addEventListener('click', async (e) => {
    if (!e.target.classList.contains('word')) return;
    if (tooltip) { tooltip.remove(); tooltip = null; }
    const word = e.target.textContent;
    const result = await browser.runtime.sendMessage({ action: 'translate', text: word });
    if (!result || result.error) return;

    tooltip = document.createElement('div');
    tooltip.className = 'reading-tooltip';
    tooltip.innerHTML = `<div class="rt-word">${esc(word)}</div><div class="rt-trans">${esc(result.translation)}</div><button id="rt-save">Save</button>`;
    const rect = e.target.getBoundingClientRect();
    tooltip.style.left = rect.left + 'px';
    tooltip.style.top = (rect.bottom + window.scrollY + 4) + 'px';
    document.body.appendChild(tooltip);

    tooltip.querySelector('#rt-save').addEventListener('click', async () => {
      await browser.runtime.sendMessage({ action: 'saveWord', data: { text: word, translation: result.translation, phonetic: result.details?.phonetic || '', pos: result.details?.meanings?.[0]?.partOfSpeech || '' } });
      tooltip.querySelector('#rt-save').textContent = 'Saved';
      tooltip.querySelector('#rt-save').disabled = true;
    });
  });

  document.addEventListener('click', (e) => {
    if (tooltip && !tooltip.contains(e.target) && !e.target.classList.contains('word')) { tooltip.remove(); tooltip = null; }
  });
})();
