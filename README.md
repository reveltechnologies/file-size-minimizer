# Fit-to-Size & Unseen Data File Shrinker

Shrink a video, photo or PDF so it fits an upload limit, and strip the hidden data (GPS, camera details, author names) along the way. Everything runs in your browser: **your files never leave your device.**

Made by [Revel Technologies](https://github.com/reveltechnologies).

---

## What it does

1. **Drop a file** (or several photos).
2. **Pick where it's going**: Discord, WhatsApp, Gmail, a visa portal… or type a custom limit.
3. **Get a file that fits**, plus a receipt showing how much smaller it got and what hidden data was removed.

| File type | Accepted formats | Output | Presets |
|---|---|---|---|
| Video | MP4, MOV, WebM, MKV, GIF | MP4 | Discord Free 10 MB · WhatsApp 16 MB · Email / Gmail 25 MB |
| Photo | JPG, PNG, WebP, HEIC / HEIF (iPhone) | JPG, or PNG to keep see-through areas | Strict Portal ID 500 KB · Standard Form 1 MB |
| PDF | PDF | PDF | Visa / Uni Portal 2 MB · Standard Doc 5 MB · Email Packet 10 MB |

**Several photos at once** are combined into one A4 PDF that fits the chosen size.

### Options

- **Remove hidden data** (on by default): GPS location, camera serial numbers, author tags, PDF edit history.
- **Smart optimize** (video, on by default): HDR → SDR, 60 → 30 FPS, and a lower resolution when the size limit is tight.
- **Mute audio** (video): drops the sound so the whole size budget goes to the picture.

If a video would look very blurry at the chosen size, the app warns you first and lets you shrink it anyway.

### How sizes are counted

Sizes use decimal units (1 MB = 1,000,000 bytes), the stricter reading of any upload limit. The app aims a little under the limit to be safe, so a 10 MB target usually gives about 9.2–9.9 MB.

---

## Running it locally

You need **Node.js 22 LTS** (Vite 8 needs at least 20.19 or 22.12). Run every command from the repository root.

```sh
git clone https://github.com/reveltechnologies/file-size-minimizer.git
cd file-size-minimizer
npm install
npm run dev
```

Then open the address it prints (usually http://localhost:5173).

> Run `npm install` from the root only, not inside `apps/web`, or the web app can't find `@revel/core`.

| Command | What it does |
|---|---|
| `npm run dev` | Starts the app with live reload |
| `npm run build` | Type-checks and builds the production site into `apps/web/dist` |
| `npm run preview` | Serves the production build locally |
| `npm test` | Runs the core unit tests (Vitest) |
| `npm run typecheck` | Type-checks `packages/core` |
| `npm run lint -w apps/web` | Lints the web app (oxlint) |

**Notes**
- The first video shrink downloads the video engine (ffmpeg.wasm, about 9 MB) from jsDelivr, so it needs an internet connection. Photos and PDFs work offline.
- Tested in Chrome and Edge.

---

## Project layout

```
apps/web/          React web app (Vite, Tailwind)
  src/engines/     Browser code that does the shrinking: video, photo, PDF, photos → PDF
  src/components/  UI pieces: drop zone, target picker, progress, receipt
packages/core/     Plain TypeScript shared with the upcoming Android app:
                   size presets, bitrate maths, ffmpeg arguments, JPEG metadata,
                   photo fitting, PDF page layout (with unit tests)
docs/              User guide: how to use the app and common questions
```

### Built with

- [React 19](https://react.dev) + [Vite 8](https://vite.dev) + [Tailwind CSS 4](https://tailwindcss.com)
- [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) for video
- [pdf-lib](https://pdf-lib.js.org) for PDFs
- [heic-to](https://github.com/hoppergee/heic-to) for iPhone photos
- The browser's canvas for photo re-encoding

---

## Repository automation

When you push to GitHub, the workflows in `.github/workflows/` (switched on or off in [`config.yaml`](config.yaml)):

- Run the **unit tests**, type checks, lint and build (`tests.yml`). A red ❌ next to a commit means one of them failed; click it to see which.
- Run **CodeQL** security analysis.
- Create or update a **GitHub Release** for each version in [`CHANGELOG.md`](CHANGELOG.md).
- Keep the supported-versions table in [`SECURITY.md`](SECURITY.md) up to date.
- Sync documentation and workflows to other active branches.

---

## Contributing

Add every change to [CHANGELOG.md](CHANGELOG.md) under a version number, and pick the version type (alpha, beta, rc or release) by how well the app works. The guide is at the top of that file.

See [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). To report a security issue, see [SECURITY.md](SECURITY.md).

## License

[GNU General Public License v3.0](LICENSE)
