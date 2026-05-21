# Tap to Translate v3 — Specification

Tài liệu này mô tả phạm vi triển khai cho ba pha cải tiến extension, làm cơ sở cho code và test.

---

## 0. Tổng quan kiến trúc

### Cấu trúc thư mục mới

```
taptotranslate/
├── manifest.json
├── background.js              ← orchestrator, gọi src/lib/*
├── content.js                 ← UI tương tác trên trang
├── content.css
├── popup.html                 ← shell
├── popup.js                   ← controllers cho từng tab
├── result.html / result.js    ← context-menu result page
├── reading.html / reading.js  ← Pha 3.8 reading mode
├── src/lib/                   ← pure logic, testable
│   ├── util.js                ← debounce, escape, sleep, levenshtein
│   ├── cache.js               ← LRU cache class
│   ├── lemma.js               ← lemmatization
│   ├── sr.js                  ← spaced repetition (SM-2 wrapper)
│   ├── csv.js                 ← CSV/TSV/JSON import-export
│   ├── distractor.js          ← chọn distractor cho quiz
│   ├── streak.js              ← streak + heatmap data
│   ├── quiz.js                ← grading typing answers
│   ├── settings.js            ← schema + defaults + migration
│   ├── history.js             ← dedup logic
│   └── i18n.js                ← string table (Vi/En)
├── decks/
│   └── toeic_basic.json       ← Pha 3.9 pre-built deck
├── _locales/
│   ├── vi/messages.json
│   └── en/messages.json
├── tests/
│   ├── _mock_browser.js       ← stub `browser.*`
│   └── *.test.js              ← node:test files
├── package.json               ← chỉ dev metadata + npm test
├── SPEC.md                    ← file này
├── TESTING.md                 ← kịch bản test thủ công UI
└── README.md
```

### Nguyên tắc module

Mỗi file trong `src/lib/` dùng UMD-ish wrapper để chạy được cả trong trình duyệt (gán vào `globalThis.TTT.*`) và Node (export qua `module.exports`):

```js
(function (root, factory) {
  const mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  root.TTT = root.TTT || {};
  root.TTT.lemma = mod;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function lemmatize(word) { /* ... */ }
  return { lemmatize };
});
```

Trong manifest, `content_scripts.js` và `background.scripts` liệt kê các file `src/lib/*.js` trước, rồi đến `content.js` / `background.js`. Popup và các HTML khác dùng nhiều `<script>` tag theo thứ tự.

---

## 1. Data schema (storage.local)

```ts
// schema_version: 2 (v1 = bản cũ chỉ có words/history/hoverMode/lastResult)

{
  schema_version: 2,
  settings: {
    sourceLang: 'en',           // ISO 639-1
    targetLang: 'vi',
    hoverMode: true,
    hoverDelayMs: 250,          // 50–1000
    fontSize: 'medium',         // 'small'|'medium'|'large'
    theme: 'auto',              // 'auto'|'light'|'dark'
    locale: 'vi',               // 'vi'|'en'
    tts: {
      rate: 1.0,                // 0.5–2.0
      voice: ''                 // tên voice; '' = default theo lang
    },
    dailyReviewAlarm: true,
    dailyReviewHour: 9,         // 0–23
    highlightSaved: false       // Pha 3.7 toggle
  },

  words: [{
    text: 'run',
    lemma: 'run',               // base form, dùng làm khóa dedup
    translation: 'chạy',
    phonetic: '/rʌn/',
    audio: '',                  // url
    pos: 'verb',                // part of speech chính
    synonyms: ['sprint'],
    antonyms: [],
    note: '',
    tags: ['toeic', 'verb'],    // Pha 2.3
    sentences: [{               // Pha 2.4 sentence mining, mảng tối đa 5
      text: 'I run every day.',
      url: 'https://...',
      date: '2026-05-21'
    }],
    level: 'learning',          // 'learning'|'hard'|'mastered'
    srNext: '2026-05-22T...',
    srInterval: 1,
    srEase: 2.5,
    srLapses: 0,
    date: '2026-05-21T...',
    lastReview: '2026-05-21T...'
  }],

  history: [{                   // tối đa 200, dedup 24h
    text: 'run',
    translation: 'chạy',
    sl: 'en', tl: 'vi',
    date: '2026-05-21T...',
    count: 1                    // số lần lookup
  }],

  decks: [{                     // Pha 2.3 saved filters
    id: 'd1',
    name: 'TOEIC Verbs',
    filter: { tags: ['toeic', 'verb'], level: null }
  }],

  translateCache: {             // Pha 1.3 LRU 500
    [`${sl}|${tl}|${textLower}`]: { result, ts }
  },

  reviewLog: [{                 // Pha 3.6 streak/heatmap
    date: '2026-05-21',         // YYYY-MM-DD local
    reviewed: 12,
    saved: 3
  }],

  lastResult: { ... }           // tạm cho result.html
}
```

### Migration v1 → v2

Khi `background.js` khởi động:
1. Đọc `schema_version`. Nếu thiếu → đang ở v1.
2. Wrap `hoverMode` cũ vào `settings.hoverMode`.
3. Bổ sung field thiếu cho mỗi `word`: `lemma = lemmatize(text)`, `tags=[]`, `sentences=[]`, `srLapses=0`, `lastReview=date`.
4. Bổ sung `history[i].sl='en'`, `tl='vi'`, `count=1`.
5. Set `schema_version: 2`.

---

## 2. Pha 1 — Sửa lỗi & nền tảng

### 1.1 Debounce hover, hủy đúng lúc

**Spec**
- Hover trigger sau `settings.hoverDelayMs` (mặc định 250ms) tính từ lần `mousemove` cuối.
- Hủy hover (clearTimeout + remove tooltip) khi: popup full đang mở; cuộn trang (`scroll`); user gõ phím; chuột rời khỏi tài liệu (`mouseleave` body); selection đang hoạt động.
- Không gọi API nếu từ trùng từ vừa hiển thị.

**Acceptance**
- Di chuột nhanh qua đoạn văn 50 từ → ≤ 1 request được gửi.
- Đang xem hover tooltip mà bấm scroll → tooltip biến mất.

### 1.2 Lọc lỗi + timeout + retry

**Spec**
- `fetch` qua wrapper `fetchWithTimeout(url, { timeout: 6000, retries: 1 })`. Dùng `AbortController`.
- Nếu Google Translate fail → trả `{ ok: false, error }`. Không cache, không thêm vào history.
- Nếu DictionaryAPI fail → vẫn cache translation (ok), `details = null`.
- Hiển thị thông báo "Network error, try again" trong popup khi cả translate fail.

**Acceptance**
- Mock network fail → cache không thay đổi, history không thêm dòng "Translation error".
- Mock 500 lần đầu, 200 lần sau → kết quả thành công nhờ retry.

### 1.3 Persist translateCache

**Spec**
- Class `LRUCache(maxSize=500)` trong `src/lib/cache.js`.
- BG load cache từ `storage.local.translateCache` khi khởi động; ghi back debounce 2s sau mỗi `set`.
- Key: `${sl}|${tl}|${textLower}`. Value: `{ result, ts }`.
- TTL 14 ngày — entry quá hạn bị bỏ khi load.

**Acceptance**
- Reload extension → cache vẫn còn entries cũ.
- Vượt 500 entries → entry ít dùng nhất bị evict.

### 1.4 Dedup history 24h

**Spec**
- Hàm `addToHistory(history, item, now)` trong `src/lib/history.js`.
- Nếu có entry cùng `(text, sl, tl)` trong 24h gần nhất → cập nhật `date = now`, `count++`, di chuyển lên đầu.
- Ngược lại unshift entry mới với `count = 1`. Cap 200.

**Acceptance**
- Tra "run" 3 lần trong 1 tiếng → history vẫn có 1 entry với `count: 3`.
- Tra "run" hôm qua + hôm nay → tạo 2 entry tách biệt nếu chênh > 24h.

### 1.5 Iframe support

**Spec**
- `manifest.json`: `content_scripts[0].all_frames: true`.
- Loại trừ frame trống (`about:blank` không có nội dung) bằng check `document.body && document.body.innerText.length > 0` trước khi gắn listener.

**Acceptance**
- Trang có iframe (vd. embedded post) → hover/click trong iframe vẫn dịch.

### 1.6 Keyboard commands

**Spec**
- `manifest.json` thêm `commands`:
  - `translate-selection` (Alt+T): gửi `{ action: 'translateSelection' }` đến tab active.
  - `toggle-hover` (Alt+H): toggle `settings.hoverMode`.
- `content.js` lắng `onMessage` cho 2 action trên.

**Acceptance**
- Bôi đen từ + Alt+T → popup full hiện.
- Alt+H → tooltip ngừng xuất hiện; bấm lại → bật lại.

### 1.7 TTS fallback

**Spec**
- Hàm `playTTS(word, opts)` trong `src/lib/util.js` (browser-only):
  1. Nếu có `audio` URL → `new Audio(url).play()`.
  2. Catch lỗi → fallback `speechSynthesis.speak(new SpeechSynthesisUtterance(word))` với `rate`, `voice` từ settings.
- Áp dụng ở popup full, hover tooltip nâng cấp, flashcard, quiz listening, result page.

**Acceptance**
- Từ "vehicle" thường thiếu audio dictionary → vẫn nghe được nhờ TTS.

### 1.8 Keyboard nav cho popup full

**Spec**
- Khi popup full mở: `Esc` đóng (đã có); `Tab` di chuyển focus theo thứ tự audio → save → close → more; `Enter` ở save → save và đóng.
- Thêm `role="dialog"`, `aria-label`, focus đầu tiên về nút save khi popup mở.

**Acceptance**
- Chỉ dùng phím vẫn save được từ.

---

## 3. Pha 2 — UX & tổ chức từ vựng

### 2.1 Search + sort

**Spec**
- Tab Words: thêm `<input type="search">` lọc theo `text`/`translation`/`tags`/`note` (debounce 150ms).
- Dropdown sort: `Date desc` (default), `Alphabetical`, `Next review`, `Level`.

**Acceptance**
- Gõ "run" → chỉ từ chứa "run" hoặc dịch chứa "chạy" hiện ra.
- Đổi sort → thứ tự thẻ thay đổi tức thì.

### 2.2 Bulk actions

**Spec**
- Mỗi card có checkbox. Toolbar trên cùng hiện khi có ít nhất 1 chọn: `Delete`, `Set level: …`, `Add tag`, `Export selected`.
- Click "Select all" trong filter hiện tại.

**Acceptance**
- Chọn 5 từ + Delete → cả 5 biến mất, storage cập nhật.
- Export selected → CSV chỉ có 5 dòng.

### 2.3 Tags + decks

**Spec**
- Mỗi word có `tags: string[]`. UI: hiển thị chip tag trong card, click "+" để thêm.
- Decks = filter saved: tên + filter (tags AND level). Lưu vào `decks` array.
- Sidebar hoặc dropdown để chọn deck đang active → tab Words/Flashcard/Quiz dùng deck đó làm pool.

**Acceptance**
- Tạo deck "TOEIC verbs" với filter tags=['toeic','verb'] → flashcard chỉ ôn từ trong deck đó.

### 2.4 Sentence mining

**Spec**
- Trong `content.js` khi user save từ: trích context từ DOM (parent text node nguyên, cắt theo `.!?` để lấy câu chứa selection, max 200 ký tự).
- Lưu vào `word.sentences[]` (cap 5, mới nhất trước).
- Hiển thị trong popup full word card và dùng cho cloze quiz.

**Acceptance**
- Save "vehicle" trong câu "He bought a new vehicle yesterday." → sentence này lưu kèm.

### 2.5 Dark mode

**Spec**
- CSS variables redefined trong `[data-theme="dark"]`.
- `popup.html` đọc `settings.theme`:
  - `auto`: theo `prefers-color-scheme`.
  - `light`/`dark`: ép cứng.
- Áp dụng cho cả `result.html`, `reading.html`. `content.css` cũng có dark variant cho popup full + tooltip.

**Acceptance**
- Bật dark trong settings → toàn bộ UI đổi nền tối, chữ sáng, contrast WCAG AA.

### 2.6 i18n

**Spec**
- `_locales/vi/messages.json` mặc định, `_locales/en/messages.json` thứ hai. `manifest.default_locale: "vi"`.
- Mọi string UI dùng `browser.i18n.getMessage('key')` hoặc helper `t('key')` đọc từ `src/lib/i18n.js`.
- Settings cho phép override `locale`.

**Acceptance**
- Lần đầu cài: UI tiếng Việt. Đổi sang en → reload popup → UI tiếng Anh.

### 2.7 Import / Export Anki

**Spec**
- **Export TSV (Anki)**: `Front\tBack\tTags` — Front = `text`, Back = `translation\n<phonetic>\n<example>`, Tags = `tags.join(' ')`.
- **Export JSON**: dump nguyên `words`.
- **Import CSV/JSON**: parse → validate schema → dialog merge (Skip existing / Overwrite / Add as new).
- Pure logic ở `src/lib/csv.js`.

**Acceptance**
- Export TSV → import vào Anki Desktop ra đúng card.
- Import JSON 100 từ → list tăng đúng 100 (hoặc skip duplicates).

### 2.8 Settings panel

**Spec**
- Tab mới "Settings" hoặc panel mở từ gear button (mở rộng cái hiện có).
- Form trường: source/target lang, hover delay slider, font size, theme, locale, TTS rate slider, TTS voice dropdown (populate từ `speechSynthesis.getVoices()`), daily review hour, highlight toggle.
- Save → ghi vào `storage.local.settings`.

**Acceptance**
- Đổi target lang sang `ja` → request mới dùng `tl=ja`, kết quả tiếng Nhật (dù app vẫn focus tiếng Việt).

### 2.9 Hover tooltip nâng cấp

**Spec**
- Tooltip hover (nhỏ) hiện: word, phonetic, POS, translation, nút "Save" nhỏ, nút loa.
- Khi user click trong tooltip → biến thành popup full (giống `mouseup`).
- `pointer-events: auto` (đổi từ `none`) khi tooltip hiện.

**Acceptance**
- Hover "negotiate" → thấy `(verb) /nɪˈɡəʊ.ʃi.eɪt/ thương lượng [💾][🔊]`.
- Click 💾 → từ được save, button đổi thành "✓".

### 2.10 Lemmatization nhẹ

**Spec**
- `src/lib/lemma.js` áp luật suffix:
  - `-ies` → `-y` (studies → study)
  - `-es` → `-e`/`-` (boxes → box, places → place)
  - `-s` → `-` (runs → run)
  - `-ing` → `-` / `-e` (running → run, making → make)
  - `-ed` → `-` / `-e` / `-y` (studied → study, baked → bake)
  - Doubled-consonant: running → run, hopped → hop.
- Bảng irregular ~50 từ (went→go, ran→run, taken→take, …).
- Khi save: tìm word theo `lemma` trước; nếu trùng → cập nhật `level/sentences/tags`, không tạo bản sao.

**Acceptance**
- Lưu "running" rồi "ran" → 1 entry với lemma "run".
- Lưu "studies" → entry "study".

---

## 4. Pha 3 — Học tập nâng cao

### 3.1 Quiz Typing

**Spec**
- Hiện definition (translation) và yêu cầu gõ từ tiếng Anh.
- Chấm điểm: exact (correct), levenshtein ≤ 1 (typo, vẫn tính đúng nhưng cảnh báo "Typo"), khác (wrong, hiện đáp án).
- Pure: `gradeTyping(answer, expected)` ở `src/lib/quiz.js`.

**Acceptance**
- Đáp án "negotaite" → "Typo (correct: negotiate)", tính điểm.
- "different" thay vì "negotiate" → wrong.

### 3.2 Quiz Cloze

**Spec**
- Chỉ chạy nếu word có `sentences[]`. Lấy 1 sentence ngẫu nhiên, mask `text` (case-insensitive) bằng `____`.
- Hiện 4 lựa chọn (chính + 3 distractor smart).

**Acceptance**
- Word "negotiate" với sentence "We need to negotiate the price" → "We need to ____ the price" + 4 đáp án.

### 3.3 Pronunciation check

**Spec**
- Dùng `webkitSpeechRecognition` / `SpeechRecognition` (Firefox không hỗ trợ → graceful: ẩn nút và hiện thông báo "Browser không hỗ trợ").
- Quiz mode: hiện từ + nút "Speak" → nhận diện → so sánh case-insensitive Levenshtein ≤ 2 → đúng.

**Acceptance**
- Trên Chrome: phát âm "vehicle" → tick xanh. Phát âm sai → đỏ + hiển thị từ nhận được.

### 3.4 Smart distractor

**Spec**
- `pickDistractors(target, pool, n=3)`:
  1. Ưu tiên cùng `pos` với target.
  2. Trong tập đó, ưu tiên độ dài chênh ≤ 2 ký tự.
  3. Nếu chưa đủ → bổ sung random từ pool.
- Đảm bảo không trùng target và unique.

**Acceptance**
- Target "negotiate" (verb 9 chars) → 3 distractor cũng verb gần độ dài (vd. "celebrate", "criticize", "establish").

### 3.5 Daily review reminder

**Spec**
- Background dùng `browser.alarms.create('daily-review', { when, periodInMinutes: 1440 })` theo `dailyReviewHour`.
- Khi alarm + có thẻ due → set badge text = số due trên browser action; nếu `notifications` permission có → hiện notification.

**Acceptance**
- Đặt giờ = giờ hiện tại + 1 phút → sau 1 phút badge hiện số due.

### 3.6 Streak + heatmap

**Spec**
- `reviewLog`: mỗi ngày 1 entry. Tăng `reviewed` mỗi lần user trả lời flashcard, `saved` mỗi lần save từ.
- Pure: `computeStreak(reviewLog, today)` trả về `{ current, longest }`.
- Tab Stats: heatmap 12 tuần × 7 ngày (SVG), color theo `reviewed`.

**Acceptance**
- Học liên tiếp 5 ngày → streak = 5. Bỏ 1 ngày → reset về 1.

### 3.7 Highlight saved words

**Spec**
- Toggle trong settings. Nếu bật, content script:
  - Lấy danh sách `lemmas` từ `words`.
  - Dùng `TreeWalker` qua textNodes (skip script/style/textarea/input/contentEditable).
  - Wrap matches bằng `<mark class="ttt-highlight" data-word="X">`.
  - Throttle qua `requestIdleCallback`, batch 200 nodes mỗi tick để không lag.
- Hover lên `mark` → tooltip mini với translation.

**Acceptance**
- Trang chứa "negotiate" và đã save → từ được gạch chân màu vàng nhạt; hover hiện nghĩa.

### 3.8 Reading mode

**Spec**
- Context menu "Reading mode for selection" → mở `reading.html` trong tab mới với selection.
- Tách câu (`.!?` không nằm trong abbreviation đơn giản), mỗi câu hiện 1 dòng, click từng từ → tooltip dịch, click "Save" trong tooltip để lưu.
- Có nút "Translate paragraph" (gọi BG translate sentence).

**Acceptance**
- Bôi đoạn 5 câu → reading mode hiện 5 dòng riêng, click từ "negotiate" → tooltip nghĩa, save được.

### 3.9 Pre-built decks

**Spec**
- File `decks/toeic_basic.json`: array ~80 từ TOEIC starter (text, translation, phonetic, pos, tag).
- Settings → "Import starter deck" → bulk import.

**Acceptance**
- Click import → 80 từ được thêm vào, có tag `toeic-basic`, `level: learning`.

---

## 5. Manifest changes (cuối cùng)

```json
{
  "manifest_version": 2,
  "name": "Tap to Translate",
  "version": "3.0",
  "default_locale": "vi",
  "description": "__MSG_extDescription__",
  "permissions": ["storage", "activeTab", "tabs", "menus", "alarms", "notifications"],
  "browser_action": { "default_popup": "popup.html", "default_icon": "icons/icon48.png" },
  "background": {
    "scripts": [
      "src/lib/util.js", "src/lib/cache.js", "src/lib/lemma.js", "src/lib/sr.js",
      "src/lib/history.js", "src/lib/settings.js", "src/lib/i18n.js", "background.js"
    ]
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "all_frames": true,
    "match_about_blank": true,
    "js": [
      "src/lib/util.js", "src/lib/lemma.js", "src/lib/i18n.js", "content.js"
    ],
    "css": ["content.css"]
  }],
  "commands": {
    "translate-selection": {
      "suggested_key": { "default": "Alt+T" },
      "description": "__MSG_cmdTranslate__"
    },
    "toggle-hover": {
      "suggested_key": { "default": "Alt+H" },
      "description": "__MSG_cmdToggleHover__"
    }
  },
  "icons": { "48": "icons/icon48.png", "96": "icons/icon96.png" }
}
```

---

## 6. Test strategy

- **Unit tests** (`tests/*.test.js`, chạy `node --test`): mọi pure module trong `src/lib/`. Không phụ thuộc DOM hay browser API thật. Khi cần `browser.*` thì dùng `tests/_mock_browser.js`.
- **Lint syntax**: `node --check` cho mỗi file `.js`.
- **Manifest validate**: parse JSON, check field bắt buộc.
- **Manual test plan**: `TESTING.md` — checklist 50+ scenarios mở extension trên Firefox và Chrome.

---

## 7. Tiêu chí "xong"

1. `npm test` PASS toàn bộ.
2. `npm run check` PASS syntax + manifest.
3. Mở extension trong Firefox + Chrome, không có lỗi console khi load + dùng cơ bản.
4. Mỗi feature trong Pha 1-3 có ít nhất 1 mục tích trong TESTING.md.
5. Migration v1→v2 không mất dữ liệu cũ (test bằng cách inject storage cũ).
