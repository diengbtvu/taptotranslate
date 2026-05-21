# TESTING.md — Manual Test Checklist

Load extension: `about:debugging` → Load Temporary Add-on → chọn `manifest.json`.

## Pha 1 — Nền tảng

- [ ] **Hover translate**: di chuột lên từ tiếng Anh → tooltip hiện sau ~250ms
- [ ] **Hover debounce**: di chuột nhanh qua nhiều từ → chỉ 1 request (check Network tab)
- [ ] **Hover cancel on scroll**: đang hover → cuộn trang → tooltip biến mất
- [ ] **Hover cancel on typing**: đang hover → gõ phím → tooltip biến mất
- [ ] **Popup full**: bôi đen từ/cụm → popup hiện với translation, phonetic, POS
- [ ] **Error handling**: tắt mạng → popup hiện "Network error, try again"
- [ ] **Cache persist**: dịch "hello" → reload extension → dịch lại → không có network request
- [ ] **History dedup**: dịch "run" 3 lần → History tab chỉ có 1 entry với ×3
- [ ] **Iframe**: mở trang có iframe → hover/click trong iframe vẫn dịch
- [ ] **Alt+T**: bôi đen từ → Alt+T → popup hiện
- [ ] **Alt+H**: Alt+H → hover translate tắt; Alt+H lại → bật
- [ ] **TTS**: click 🔊 trên popup → nghe phát âm (audio hoặc speechSynthesis)
- [ ] **Keyboard nav**: popup mở → Tab di chuyển focus → Enter save → Esc đóng

## Pha 2 — UX

- [ ] **Search**: tab Words → gõ "run" → chỉ từ liên quan hiện
- [ ] **Sort**: đổi dropdown → thứ tự thẻ thay đổi
- [ ] **Bulk delete**: tick 3 từ → Delete → 3 từ biến mất
- [ ] **Bulk set level**: tick 2 từ → Mastered → level đổi
- [ ] **Tags**: click +tag → nhập "toeic" → chip hiện; click filter tag → lọc
- [ ] **Sentence mining**: save từ trong câu → card hiện câu italic
- [ ] **Dark mode**: click 🌙 → UI đổi tối; click lại → sáng
- [ ] **Settings**: đổi target lang sang "ja" → dịch ra tiếng Nhật
- [ ] **Hover delay**: đổi slider 500ms → hover chậm hơn
- [ ] **Export CSV**: click Export CSV → file tải về, mở được trong Excel
- [ ] **Export Anki TSV**: click → file .tsv, import vào Anki thành công
- [ ] **Import JSON**: export JSON → xóa data → import lại → từ phục hồi
- [ ] **Import TOEIC deck**: click → 50 từ thêm vào với tag toeic-basic
- [ ] **Hover tooltip nâng cấp**: hover → thấy POS, phonetic, 💾, 🔊
- [ ] **Save from hover**: click 💾 trên tooltip → từ lưu, button đổi ✓
- [ ] **Lemma dedup**: save "running" rồi "ran" → chỉ 1 entry "run"

## Pha 3 — Học tập

- [ ] **Flashcard**: tab Flashcard → click card → hiện đáp án → bấm OK/Hard/Easy
- [ ] **Quiz MC**: tab Quiz → Multiple Choice → 10 câu, chọn đáp án
- [ ] **Quiz Typing**: chọn Typing → gõ từ → Enter → chấm điểm
- [ ] **Quiz Cloze**: chọn Cloze → fill blank từ sentence đã lưu
- [ ] **Quiz Pronunciation** (Chrome only): chọn Pronunciation → nói từ → nhận diện
- [ ] **Smart distractor**: quiz MC → 4 đáp án cùng POS, gần độ dài
- [ ] **Daily alarm**: đặt giờ review → badge hiện số due
- [ ] **Streak/heatmap**: tab Stats → thấy streak + heatmap SVG
- [ ] **Highlight**: Settings → bật Highlight → từ đã lưu trên trang được gạch chân vàng
- [ ] **Reading mode**: bôi đoạn → chuột phải → Reading mode → tab mới, click từ → tooltip
- [ ] **Clear all**: Settings → Clear all data → confirm → data xóa sạch

## Regression

- [ ] Reload extension → data vẫn còn (words, history, settings)
- [ ] Mở popup fullscreen → layout responsive
- [ ] Không có lỗi console khi load extension
- [ ] Không có lỗi console khi dùng các tính năng cơ bản
