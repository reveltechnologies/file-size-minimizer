# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!--- To add private notes or comments in this changelog that won't show in the rendered release, use markdown comments like this. -->

<!--
Add every change here. Pick the version type by how well the app works:
  -alpha.X  early build, features still missing or rough
  -beta.X   every feature works and is tested, not public yet
  -rc.X     release candidate, only bug fixes before the release
  (none)    release, public and stable
The release workflow marks alpha, beta and rc versions as pre-releases on GitHub.
-->

## [0.5.0-beta.1] - 2026-11-08

**Type:** Beta. Every feature works and has been tested in Chrome and Edge, but the app isn't public yet.

### Added
- Mobile-first vertical phone UI tailored for all phone screen sizes (compact to tall screens), with sticky app bar, thumb-friendly bottom action bar, and full-width touch controls.
- Portrait orientation lock via Web App Manifest (`portrait-primary`), Screen Orientation API, and a landscape rotation blocker overlay on mobile devices.
- Official app logo (`logo.png`) used as the app icon and in the top-left header of the app.
- `run.py` in the repository root to automatically install dependencies, launch the dev server, open the app in a standalone portrait phone window (`412×880`), and shut everything down when the window closes.

### Changed
- Moved all code and workspace files (`apps/`, `packages/`, `package.json`, `package-lock.json`) into `src/` to separate the application code from repository documentation and workflows.

## [0.4.2-beta.1] - 2026-11-05

**Type:** Beta. Every feature works and has been tested in Chrome and Edge, but the app isn't public yet.

### Added
- Unit tests for the web app: file picking and validation, size limits (presets and custom sizes) and the progress bar rules (never goes backwards, room for retries, slows down near the end). `npm test` and the Tests workflow now run them alongside the core tests.

### Changed
- Updated Vitest from 5.0.5 to 5.1.0.

## [0.4.1-beta.1] - 2026-11-05

**Type:** Beta. Every feature works and has been tested in Chrome and Edge, but the app isn't public yet.

### Added
- A Tests workflow that runs the unit tests, type checks, lint and build on every push and pull request. It can be turned off with `unit_tests` in `config.yaml`.

## [0.4.0-beta.1] - 2026-10-29

**Type:** Beta. Every feature works and has been tested in Chrome and Edge, but the app isn't public yet.

### Added
- PNG and WebP images can be saved as PNG, keeping see-through areas. Images with see-through areas are saved as PNG by default; others stay JPG, the smallest option.
- A "Save as" choice (JPG or PNG) for PNG and WebP images, with a warning when JPG would turn see-through areas white.
- The settings screen says when a photo will be saved as JPG (e.g. iPhone HEIC photos), and the receipt says which format was used.

### Fixed
- PNG images were always turned into JPG without telling the user, and lost their transparency.

## [0.3.0-beta.1] - 2026-10-29

**Type:** Beta. Every feature works and has been tested in Chrome and Edge, but the app isn't public yet.

### Added
- A warning before shrinking a video that would look very blurry, with an option to shrink it anyway.
- A clear warning on the receipt when a file can't get under the limit, showing the smallest size reached.
- A README describing what the app does and how to run it.

### Changed
- Friendlier progress screen with steps (Preparing, Shrinking, Done) and a bar that never goes backwards.
- Combined photo order is shown as a numbered list, which reads better on small screens.
- Turned off the wiki sync in `config.yaml`; the project doesn't use a wiki.

### Security
- Fixed a slow regular expression (polynomial ReDoS) when reading video details.

## [0.2.0-alpha.1] - 2026-10-27

**Type:** Alpha. Early build for testing, not public.

### Added
- Combine several photos into one A4 PDF that fits the chosen size.

## [0.1.0-alpha.1] - 2026-10-26

**Type:** Alpha. First working build, not public.

### Added
- Web app built with Vite, React, TypeScript and Tailwind.
- Shared `@revel/core` package with size presets, bitrate maths, ffmpeg arguments, JPEG metadata, photo fitting and PDF layout, with unit tests.
- Size presets: Discord Free, WhatsApp and Email / Gmail for video; Strict Portal ID and Standard Form for photos; Visa / Uni Portal, Standard Doc and Email Packet for PDFs; plus a custom limit.
- Video shrinking with ffmpeg.wasm (MP4, MOV, WebM, MKV, GIF → MP4), with automatic retries when a result comes out slightly too big.
- Smart optimize for video (HDR → SDR, 60 → 30 FPS, lower resolution when the limit is tight) and a Mute audio option.
- Photo shrinking (JPG, PNG, WebP, HEIC / HEIF) that finds the best quality and size that fits.
- PDF shrinking that removes edit history and unused data, then re-compresses large photos and scans.
- Remove hidden data: GPS location, camera serial numbers, author tags and PDF metadata.
- Savings receipt showing the before and after size, plus download and share.
- Everything runs in the browser; files never leave the device.
