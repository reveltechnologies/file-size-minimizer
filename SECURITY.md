# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.5.x   | :white_check_mark: |
| < 0.5   | :x:                |

## Local-Only Architecture & Data Privacy

Fit-to-Size File Shrinker is designed to process all files strictly on the user's device:

- **Zero File Uploads:** Videos, photos, PDFs, and viewed files are processed in local memory inside the browser or mobile WebView. No file contents or metadata are ever transmitted to external servers.
- **On-Device Storage:** User settings (`localStorage`) and recent file history (`IndexedDB`) remain exclusively on the local device and can be disabled or cleared at any time in **Settings**.
- **Metadata Stripping:** When **Remove metadata** is enabled, EXIF tags, GPS coordinates, camera serial numbers, and PDF edit history are stripped locally before saving.

## Reporting a Vulnerability

If you discover a security vulnerability, please report it via [GitHub Private Vulnerability Reporting](https://github.com/reveltechnologies/file-size-minimizer/security/advisories/new) or by contacting [Revel Technologies](https://github.com/reveltechnologies) directly. Please do not open a public issue for undisclosed vulnerabilities.
