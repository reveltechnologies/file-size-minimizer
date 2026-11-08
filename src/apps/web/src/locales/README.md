# Contributing Translations

All app translations live in this folder (`src/apps/web/src/locales/`). Every `.json` file in this directory is automatically loaded into the **Language** selector in Settings.

## How to Add a New Language

1. Copy [`en_us.json`](en_us.json) to a new file named with the lowercase `<language>_<region>.json` code (for example `de_de.json`, `es_es.json`, `fr_fr.json`, `ja_jp.json`).
2. Update the `_meta` block at the top of the file:
   ```json
   "_meta": {
     "code": "de_de",
     "name": "German (DE)",
     "nativeName": "Deutsch"
   }
   ```
3. Translate the string values while keeping `{placeholders}` (such as `{size}`, `{count}`, `{lines}`) intact.
4. Any missing key automatically falls back to `en_us.json`.

