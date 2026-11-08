# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0-beta.1] - 2026-11-08

### Added
- Portrait mobile UI with `logo.png` header, swipe navigation, and bottom slide/tap bar across **View**, **Shrink**, and **Settings**.
- Local **View** scene for `.txt`, `.log`, `.json`, `.csv`, code/config files, HEIC photos, PDFs, audio/video, and binary hex/text inspection.
- Multi-language support (`en_us` and `tr_tr`) with automatic device language detection on first launch.
- **Settings** scene with 5 themes (Dark Green default), output folder mode, custom file prefix/suffix, default options, and links to GitHub, `SECURITY.md`, `TERMS_OF_USE.md`, and `LICENSE`.
- Local IndexedDB history for the last 10 viewed and last 10 shrunk files with re-view, re-download, and clear/disable controls.
- `run.py` launcher for running the app in a standalone portrait window.

### Changed
- Moved workspace packages (`apps/`, `packages/`, `package.json`) into `src/`.
- Simplified UI copy and replaced text action buttons with icons.

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
