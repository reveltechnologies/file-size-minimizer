# Privacy Policy

_Last updated: November 27, 2026_

**File Size Minimizer** ("the App") is developed by [Revel Technologies](https://github.com/reveltechnologies).

## 1. No Data Collection

The App does not collect, transmit, store, or share any personal information, files, photos, videos, PDFs, text or code files, device identifiers, or usage analytics.

## 2. 100% On-Device Processing

All file compression, format conversion, metadata removal, text minification, and file viewing run locally on your device. Your files never leave your phone or computer.

## 3. Local Storage & History

- **Settings**: Your language, theme, output preferences, history limit, and default options are stored locally on your device (`localStorage`).
- **Recent Files**: When enabled in Settings, up to a configurable number of recently viewed and shrunk files (`1–50`, default `10`) are stored locally on your device (`IndexedDB`) so you can open or save them again. You can change the limit, clear history, or disable this feature at any time in **Settings**, or remove it by uninstalling the App.
- **Session State**: Temporary UI state (such as dismissing an in-session update prompt) is held locally in `sessionStorage` and cleared when the session ends.

## 4. Permissions

The App uses your device's system file picker to open only the specific files you select. It does not request background access to your photos, media library, camera, microphone, contacts, or location. The Android build explicitly removes the `INTERNET` permission (`tools:node="remove"`).

## 5. Third-Party Services & Update Checks

The App contains no advertising SDKs, analytics trackers, crash reporters, or cloud upload APIs. On Android installs distributed through Google Play, the App uses Google Play's official In-App Updates API to ask the Google Play Store app on the device whether a newer version is available; no files, user data, or custom identifiers are sent by the App.

## 6. Contact

Questions or privacy inquiries can be submitted via GitHub:
https://github.com/reveltechnologies/file-size-minimizer
