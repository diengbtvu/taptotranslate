(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else { root.TTT = root.TTT || {}; root.TTT.i18n = mod; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var strings = {
    vi: {
      extDescription: 'Nhấn để dịch, lưu từ vựng, flashcard, quiz - công cụ học TOEIC',
      cmdTranslate: 'Dịch đoạn đã chọn',
      cmdToggleHover: 'Bật/tắt dịch khi hover',
      words: 'Từ vựng',
      flashcard: 'Flashcard',
      quiz: 'Quiz',
      history: 'Lịch sử',
      stats: 'Thống kê',
      settings: 'Cài đặt',
      save: 'Lưu từ',
      saved: 'Đã lưu',
      close: 'Đóng',
      translating: 'Đang dịch...',
      networkError: 'Lỗi mạng, thử lại',
      noWords: 'Chưa có từ nào.',
      noWordsHint: 'Nhấn vào từ tiếng Anh trên trang web để dịch và lưu.',
      all: 'Tất cả',
      learning: 'Đang học',
      hard: 'Khó',
      mastered: 'Thuộc',
      search: 'Tìm kiếm...',
      delete: 'Xóa',
      export: 'Xuất',
      import: 'Nhập',
      darkMode: 'Chế độ tối',
      hoverTranslate: 'Dịch khi hover',
      on: 'BẬT',
      off: 'TẮT',
      dueNow: 'Cần ôn',
      tomorrow: 'Ngày mai',
      inDays: 'Sau {n} ngày',
      allCaughtUp: 'Đã ôn hết!',
      sessionComplete: 'Hoàn thành phiên!',
      reviewed: 'Đã ôn {n} thẻ',
      correct: 'Đúng',
      wrong: 'Sai',
      typo: 'Lỗi chính tả',
      streak: 'Chuỗi ngày',
      today: 'Hôm nay',
      thisWeek: 'Tuần này',
      total: 'Tổng',
      selectAll: 'Chọn tất cả',
      deselectAll: 'Bỏ chọn',
      addTag: 'Thêm tag',
      typeAnswer: 'Gõ đáp án...',
      speakNow: 'Nói ngay',
      notSupported: 'Trình duyệt không hỗ trợ',
      importDeck: 'Nhập bộ từ',
      reading: 'Chế độ đọc'
    },
    en: {
      extDescription: 'Click to translate, save vocabulary, flashcards, quiz - TOEIC learning tool',
      cmdTranslate: 'Translate selection',
      cmdToggleHover: 'Toggle hover translate',
      words: 'Words',
      flashcard: 'Flashcard',
      quiz: 'Quiz',
      history: 'History',
      stats: 'Stats',
      settings: 'Settings',
      save: 'Save word',
      saved: 'Saved',
      close: 'Close',
      translating: 'Translating...',
      networkError: 'Network error, try again',
      noWords: 'No words saved yet.',
      noWordsHint: 'Click on any English word on a web page to translate and save it.',
      all: 'All',
      learning: 'Learning',
      hard: 'Hard',
      mastered: 'Mastered',
      search: 'Search...',
      delete: 'Delete',
      export: 'Export',
      import: 'Import',
      darkMode: 'Dark mode',
      hoverTranslate: 'Hover translate',
      on: 'ON',
      off: 'OFF',
      dueNow: 'Due now',
      tomorrow: 'Tomorrow',
      inDays: 'In {n} days',
      allCaughtUp: 'All caught up!',
      sessionComplete: 'Session complete!',
      reviewed: 'Reviewed {n} cards',
      correct: 'Correct',
      wrong: 'Wrong',
      typo: 'Typo',
      streak: 'Streak',
      today: 'Today',
      thisWeek: 'This week',
      total: 'Total',
      selectAll: 'Select all',
      deselectAll: 'Deselect all',
      addTag: 'Add tag',
      typeAnswer: 'Type your answer...',
      speakNow: 'Speak now',
      notSupported: 'Not supported by browser',
      importDeck: 'Import deck',
      reading: 'Reading mode'
    }
  };

  var currentLocale = 'vi';

  function setLocale(locale) { currentLocale = (locale && strings[locale]) ? locale : 'vi'; }
  function getLocale() { return currentLocale; }

  function t(key, params) {
    var s = (strings[currentLocale] && strings[currentLocale][key]) || key;
    if (params) {
      Object.keys(params).forEach(function (k) {
        s = s.replace('{' + k + '}', params[k]);
      });
    }
    return s;
  }

  return { t: t, setLocale: setLocale, getLocale: getLocale, strings: strings };
});
