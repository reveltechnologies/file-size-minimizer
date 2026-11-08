# File Size Minimizer

Shrink videos, photos, and PDFs to fit upload limits, strip metadata, and view local files on your device. Everything runs locally: **your files never leave your device.**

Made by [Revel Technologies](https://github.com/reveltechnologies).

---

## Features

- **Shrink** videos, photos, and PDFs under presets (`Discord`, `WhatsApp`, `Gmail`, `Portal ID`, `Visa Portal`) or a custom KB/MB target.
- **Combine photos** into a single A4 PDF sized under your chosen limit.
- **View** local files directly on your phone (`.txt`, `.json`, `.csv`, `.log`, code files, HEIC, PDF, audio/video, and binary hex/text).
- **Strip metadata** (EXIF, GPS, camera serials, author tags, and PDF revision history).
- **100% Offline & Local**: All engines (including `ffmpeg.wasm`, `pdf-lib`, and `heic-to`) are bundled locally with zero external network requests.
- **Settings**: 5 themes (Dark Green default), English (`en_us`) and Turkish (`tr_tr`) with automatic device language detection, output folder & file naming, and optional local history for the last 10 viewed and 10 shrunk files.

| File type | Accepted formats | Output | Presets |
|---|---|---|---|
| Video | MP4, MOV, WebM, MKV, GIF | MP4 | Discord Free 10 MB · WhatsApp 16 MB · Email / Gmail 25 MB |
| Photo | JPG, PNG, WebP, HEIC / HEIF | JPG or PNG | Strict Portal ID 500 KB · Standard Form 1 MB |
| PDF | PDF | PDF | Visa / Uni Portal 2 MB · Standard Doc 5 MB · Email Packet 10 MB |

---

## Running locally

Requires **Node.js 22 LTS**.

To install dependencies, start the dev server, and open the app in a standalone portrait window:

```sh
python run.py
```

Or run `npm` directly from `src/`:

```sh
cd src
npm install
npm run dev
```

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check and build production bundle into `src/apps/web/dist` |
| `npm run preview` | Preview production build locally |
| `npm test` | Run unit tests (`packages/core` and `apps/web`) |
| `npm run typecheck` | Type-check `packages/core` |
| `npm run lint -w apps/web` | Lint web app with oxlint |

---

## Building the Google Play Bundle (`.aab`)

The Android project (`com.reveltechnologies.filesizeminimizer`) lives in `src/apps/web/android` (targetSdk 36, portrait-locked).

```sh
cd src/apps/web
npm run cap:sync
cd android
./gradlew bundleRelease
```

The release Android App Bundle is generated at `src/apps/web/android/app/build/outputs/bundle/release/app-release.aab`.

---

## Project structure

```
src/
  apps/web/          React + Vite + Tailwind + Capacitor mobile app
    android/         Android Gradle project for Google Play (.aab)
    src/components/  UI scenes and components
    src/engines/     Local video, image, and PDF compression engines
    src/lib/         State, i18n, storage, and native file/share helpers
    src/locales/     Language files (en_us.json, tr_tr.json)
  packages/core/     Shared TypeScript core (presets, bitrate math, metadata, layout)
```

---

## Legal & Contributing

- [Privacy Policy](PRIVACY_POLICY.md)
- [Security Policy](SECURITY.md)
- [Terms of Use](TERMS_OF_USE.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [GNU General Public License v3.0](LICENSE)
