# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## Local-Only Architecture

File Size Minimizer processes all files locally on the user's device:

- **No File Uploads:** Videos, photos, PDFs, text/code files, and viewed files are processed in local memory on the device. No file contents or metadata are sent to external servers, and the Android manifest removes the `INTERNET` permission (`tools:node="remove"`).
- **Local Storage:** Settings (`localStorage`), session prompt state (`sessionStorage`), and configurable recent file history (`1–50` entries in `IndexedDB`) stay on the device and can be disabled or cleared in **Settings**.
- **Metadata Removal:** When **Remove hidden info** is enabled, EXIF tags, GPS coordinates, camera serial numbers, and PDF edit history are stripped locally before saving.
- **Play Update Check:** On Android, `PlayUpdatePlugin` uses Google Play's In-App Updates API over local binder IPC with the Google Play Store app.

## Reporting a Vulnerability

Report security issues via [GitHub Private Vulnerability Reporting](https://github.com/reveltechnologies/file-size-minimizer/security/advisories/new). Please do not open public issues for undisclosed vulnerabilities.
