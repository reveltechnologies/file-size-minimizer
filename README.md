# File Size Minimizer

Shrink videos, photos, PDFs, and text/code files to fit upload limits, strip hidden metadata, and view local files on your device. Everything runs locally: **your files never leave your device.**

Made by [Revel Technologies](https://github.com/reveltechnologies).

---

## Features

- **Shrink** videos, photos, PDFs, and text/code files under presets (`Discord`, `WhatsApp`, `Email`, `ID Photo`, `Form`, `Portal`, `Document`, `100 KB`–`1 MB`) or a custom KB/MB limit, with live pre-shrink size estimates.
- **Granular options** under **More options**: keep original 100% dimensions or resize, adjust quality, choose `JPG`, `WebP`, or `PNG` photo output, convert photos to black & white, tune video FPS/sound (`Normal`, `Low`, `Off`), or minify/gzip text and code files.
- **Combine photos** into a single A4 PDF sized under your chosen limit.
- **View** local files directly on your device (`.txt`, `.json`, `.csv` table view, `.log`, code files, HEIC, PDF, audio/video, and binary hex/text) and send them straight between **View** and **Shrink**.
- **Remove hidden info** (EXIF, GPS, camera serials, author tags, and PDF revision history) locally.
- **Offline Architecture**: All compression and viewer engines (`ffmpeg.wasm`, `pdf-lib`, `heic-to`) are bundled locally, and the Android build explicitly removes the `INTERNET` permission. On Google Play installs, `PlayUpdatePlugin` uses Google Play's local In-App Updates API to notify you when an update is available.
- **Settings**: 5 themes (**Dark** default, **Dark Green**, **OLED Black**, **Sage Light**, **Light**), English (`en_us`) and Turkish (`tr_tr`) with automatic language detection, save location & custom prefix/suffix, and configurable local recent-file history (`1–50`, default `10`).

| File type | Accepted formats | Output | Presets |
|---|---|---|---|
| Video | MP4, MOV, WebM, MKV, GIF | MP4 | Discord 10 MB · WhatsApp 16 MB · Email 25 MB |
| Photo | JPG, PNG, WebP, HEIC / HEIF | JPG, WebP, or PNG | ID Photo 500 KB · Form 1 MB |
| PDF | PDF | PDF | Portal 2 MB · Document 5 MB · Email 10 MB |
| Text | TXT, PY, JSON, XML, SVG, HTML, CSS, JS/TS, CSV, MD, YAML, SQL, etc. | Keep format (minified) or `.gz` | 100 KB · 500 KB · 1 MB |

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
    android/         Android Gradle project for Google Play (.aab) + PlayUpdatePlugin.java
    src/components/  UI scenes, update prompt, and controls
    src/engines/     Local video, image, PDF, and text compression engines
    src/lib/         State, i18n, storage, estimation, Play update bridge, save/share
    src/locales/     Language files (en_us.json, tr_tr.json)
  packages/core/     Shared TypeScript core (presets, bitrate math, metadata, layout, text shrink)
```

---

## Legal & Contributing

- [Privacy Policy](PRIVACY_POLICY.md)
- [Security Policy](SECURITY.md)
- [Terms of Use](TERMS_OF_USE.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [GNU General Public License v3.0](LICENSE)
