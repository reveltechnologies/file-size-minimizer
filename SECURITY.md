# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## Local-Only Architecture

File Size Minimizer processes all files locally on the user's device:

- **No File Uploads:** Videos, photos, PDFs, and viewed files are processed in local memory on the device. No file contents or metadata are sent to external servers.
- **Local Storage:** Settings (`localStorage`) and recent file history (`IndexedDB`) stay on the device and can be disabled or cleared in **Settings**.
- **Metadata Removal:** When **Remove metadata** is enabled, EXIF tags, GPS coordinates, camera serial numbers, and PDF edit history are stripped locally before saving.

## Reporting a Vulnerability

Report security issues via [GitHub Private Vulnerability Reporting](https://github.com/reveltechnologies/file-size-minimizer/security/advisories/new). Please do not open public issues for undisclosed vulnerabilities.
