# Contributing Guide

Thank you for considering contributing! Here are guidelines to help you get started.

---

## Code of Conduct

Please be respectful, constructive, and collaborative in all interactions within this project.

---

## How Can I Contribute?

### Reporting Bugs

- Check existing Issues to see if the bug has already been reported.
- If not, open a new Issue describing:
  - Clear steps to reproduce the behavior.
  - Expected vs. actual results.
  - Relevant environment details (OS, language/framework versions).

### Suggesting Enhancements

- Open an Issue describing the proposed feature or improvement.
- Explain why this enhancement would be useful and how it could work.

### Submitting Pull Requests

1. **Fork** the repository and create your branch from the default branch:
   ```bash
   git checkout -b feature/my-new-feature
   ```
2. **Make your changes**:
   - Keep your code clean, readable, and properly tested.
   - Follow established coding conventions in the codebase.
3. **Commit your changes**:
   - Write clear, descriptive commit messages.
4. **Push to your fork** and submit a **Pull Request**:
   - Clearly describe the problem and your solution.
   - Reference any related issues (e.g., `Closes #12`).

---

## Development Guidelines

- Ensure existing workflows and automated checks pass.
- Update documentation and changelogs when introducing new features or breaking changes.

---

## Contributing Translations

All UI strings are stored in JSON locale files inside [`src/apps/web/src/locales/`](src/apps/web/src/locales):

- [`en_us.json`](src/apps/web/src/locales/en_us.json) — English (US)
- [`tr_tr.json`](src/apps/web/src/locales/tr_tr.json) — Turkish (TR)

To add a new language, copy `en_us.json` to `<language>_<region>.json` (e.g. `de_de.json`), update its `_meta` block (`code`, `name`, `nativeName`), and translate the values. New `.json` files in `src/apps/web/src/locales/` are automatically added to the in-app Language selector.
