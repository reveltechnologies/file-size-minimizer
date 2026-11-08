# Contributing Guide

Thank you for contributing to File Size Minimizer.

---

## Reporting Bugs & Feature Requests

- Check existing issues before opening a new one.
- For bugs, include steps to reproduce, expected vs. actual behavior, and your device/browser version.

## Pull Requests

1. Fork the repository and create a branch (`git checkout -b feature/name`).
2. Run tests and checks from `src/`:
   ```sh
   cd src
   npm test
   npm run typecheck
   npm run lint -w apps/web
   npm run build
   ```
3. Add your changes to [CHANGELOG.md](CHANGELOG.md) and open a Pull Request.

---

## Translations

UI strings live in [`src/apps/web/src/locales/`](src/apps/web/src/locales):

- [`en_us.json`](src/apps/web/src/locales/en_us.json) — English (US)
- [`tr_tr.json`](src/apps/web/src/locales/tr_tr.json) — Turkish (TR)

To add a language, copy `en_us.json` to `<lang>_<region>.json` (for example `de_de.json`), update `_meta` (`code`, `name`, `nativeName`), and translate the values. New `.json` files in `src/apps/web/src/locales/` are picked up automatically by the Language selector in Settings.
