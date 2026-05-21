# Tap to Translate

[![Build & Release](https://github.com/diengb/taptotranslate/actions/workflows/release.yml/badge.svg)](https://github.com/diengb/taptotranslate/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A Firefox extension for English-Vietnamese translation on click/hover, vocabulary saving, spaced repetition flashcards, quizzes, and TOEIC study tools.

## Features

### Translation
- Hover translate (250ms debounce, configurable)
- Click/select text for detailed popup (phonetic, POS, synonyms, antonyms)
- Context menu for PDF and pages where content scripts cannot inject
- Keyboard shortcuts: `Alt+T` (translate selection), `Alt+H` (toggle hover)
- TTS fallback (speechSynthesis when dictionary audio unavailable)

### Vocabulary Management
- Search + sort (date, alphabetical, next review, level)
- Bulk actions (multi-select, delete, change level, export)
- Tags and filtering by tag
- Sentence mining (auto-save context sentence)
- Lemmatization (groups inflections: running/ran -> run)
- Import CSV/JSON, Export CSV/Anki TSV/JSON
- Pre-built TOEIC starter deck (50 words)

### Learning
- Flashcards with Spaced Repetition (SM-2)
- Quiz modes: Multiple Choice, Typing, Cloze, Pronunciation
- Smart distractors (same POS + similar length)
- Daily review reminder (alarm + badge + notification)
- Streak tracking + 12-week heatmap
- Highlight saved words on web pages
- Reading mode (split sentences, click-to-translate)

### Interface
- Dark mode (auto/light/dark)
- Fullscreen popup
- Full settings panel (language pair, hover delay, TTS rate, theme)

## Installation

### From Release (recommended)
1. Download the latest `.xpi` from [Releases](../../releases)
2. Drag and drop into Firefox, or: `about:addons` -> gear icon -> Install Add-on From File

### From source (dev)
1. Clone this repo
2. Firefox -> `about:debugging` -> "This Firefox" -> "Load Temporary Add-on" -> select `manifest.json`

## Development

```bash
npm test          # 76 unit tests (node:test)
npm run check     # Syntax lint + manifest validate
npx web-ext run   # Auto-reload dev mode
```

## Project Structure

```
src/lib/     - Pure logic modules (testable, UMD)
tests/       - Unit tests (node:test)
decks/       - Pre-built vocabulary decks
_locales/    - i18n (vi, en)
tools/       - Build/check scripts
```

## Contributing

Contributions of all kinds are welcome! Whether it is a bug fix, new feature, documentation improvement, or just feedback -- everything is appreciated.

### How to contribute

1. Fork the repo
2. Create a new branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add: short description"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

### Guidelines

- Run `npm test` before submitting a PR -- all tests must pass
- Write tests for new logic in `src/lib/`
- Keep code simple and readable
- Commit messages in English or Vietnamese are both fine

### Issues & Bug Reports

Open a new [Issue](../../issues) with a detailed description. Screenshots and steps to reproduce are very helpful!

## Author

**Minh Dien Tran**
- Email: dientrantravinh02@gmail.com
- GitHub: [@diengb](https://github.com/diengb)

## License

This project is released under the [MIT License](LICENSE). You are free to use, modify, and distribute it.

---

If you find this useful, please give the repo a star!
