# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3] - 2026-11-10

### Fixed
- Fixed mobile UI sizing issue on Android phones where a hardcoded max-width constraint caused pillarbox black borders and restricted content width on devices wider than 430px.
- Set base viewport background to the theme shell color on mobile and native Capacitor platforms, eliminating dark border artifacts on high-resolution displays.
- Added horizontal safe-area insets (`safe-area-inset-left`, `safe-area-inset-right`) across header, content scroll view, and bottom navigation bar.
- Added bottom scroll padding to prevent content crowding above the bottom scene navigation bar.
- Balanced settings theme selection grid layout so lone trailing options span full width.
- Fixed file size inflation bug where files smaller than a chosen preset (e.g. an 894 KB video under a 10 MB limit) were re-encoded at high bitrates, causing output files to expand instead of shrink.
- Added strict size-reduction guarantees across video and image encoders: target bitrates and byte budgets are automatically capped below the source file's size and bitrate, and compressors will never return an output larger than the input file.
- Enhanced target picker to default to a sub-source target when all standard presets exceed the input file size, and added "Already fits" indicators on presets larger than the file.
- Corrected savings receipt to prevent false-positive green checkmarks and `-0%` savings when an output matches or cannot be reduced below the source size.

### Changed
- Bumped Android release to `1.0.3` (`versionCode 4`) for Google Play rollout.

## [1.0.2] - 2026-11-09

### Changed
- Bumped Android release to `1.0.2` (`versionCode 3`) for Google Play Console rollout.
- Updated repository ignore rules for local Play Store graphic assets.

## [1.0.1] - 2026-11-09

### Changed
- Replaced legacy Android raster splash drawables with the AndroidX `SplashScreen` API (`core-splashscreen`) and enabled R8 code minification and resource shrinking (`shrinkResources`) for smaller `.aab` release bundles.
- Updated CodeQL workflow to analyze Java sources in build-less mode (`build-mode: none`).

### Security
- Hardened browser download and preview object URLs in `saveFile.ts` and `FileViewer.tsx` against DOM XSS (`js/xss-through-dom`).

## [1.0.0] - 2026-11-08

First stable production release for Google Play and web.

### Added
- Google Play Android release build (`.aab`) via Capacitor (`com.reveltechnologies.filesizeminimizer`, targetSdk 36, portrait-locked, AndroidX `SplashScreen` API, adaptive launcher icons, native file saving and sharing).
- Bundled `@ffmpeg/core` (`ffmpeg-core.js` and `ffmpeg-core.wasm`) locally so video compression works 100% offline without external CDN requests.
- Dedicated [Privacy Policy](PRIVACY_POLICY.md) (`PRIVACY_POLICY.md`) linked in Settings alongside Security Policy, Terms of Use, and GPL-3.0 License.
- Portrait mobile UI with `logo.png` header, full-screen horizontal swipe navigation, and bottom slide/tap bar across **View**, **Shrink**, and **Settings**.
- On-device **View** scene for `.txt`, `.log`, `.json`, `.csv`, code/config files, HEIC photos, PDFs, audio/video, and binary hex/text inspection.
- Multi-language support (`en_us` and `tr_tr`) with automatic device language detection on first launch.
- **Settings** scene with 5 themes (Dark Green default), output folder mode, custom file prefix/suffix, and default compression options.
- Local IndexedDB history for the last 10 viewed and last 10 shrunk files with re-view, re-download, and clear/disable controls.
- `run.py` launcher for running the app locally in a standalone portrait window.

### Changed
- Moved workspace packages (`apps/`, `packages/`, `package.json`) into `src/`.
- Simplified UI copy, codebase comments, and repository documentation.

## [0.5.0-beta.1] - 2026-11-08

### Added
- Pre-release mobile UI, local file viewer, themes, i18n (`en_us`, `tr_tr`), and local file history.

## [0.4.2-beta.1] - 2026-11-05

### Added
- Unit tests for file picking, target calculation, and progress smoothing in `apps/web`.

### Changed
- Updated Vitest to 5.1.0.

## [0.4.1-beta.1] - 2026-11-05

### Added
- GitHub Actions workflow (`tests.yml`) running unit tests, type checks, lint, and build.

## [0.4.0-beta.1] - 2026-10-29

### Added
- PNG output option for PNG and WebP images to preserve transparency.

### Fixed
- Preserved transparency instead of forcing JPG conversion on transparent PNGs.

## [0.3.0-beta.1] - 2026-10-29

### Added
- Low-bitrate video warning with an option to shrink anyway.
- Receipt notice when a file cannot be reduced below the target size.

### Security
- Fixed polynomial regex in ffmpeg stream parsing.

## [0.2.0-alpha.1] - 2026-10-27

### Added
- Combine multiple photos into a single A4 PDF under a target size.

## [0.1.0-alpha.1] - 2026-10-26

### Added
- Initial web app and `@revel/core` package for local video, photo, and PDF compression.
