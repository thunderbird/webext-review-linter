# WebExtension Linter For Reviewers

This Node.js tool aggressively lints WebExtension ZIP files. It removes unused JavaScript parameters, strips comments from JS/CSS/HTML, formats code using Prettier, and produces a new ZIP prefixed with `linted_`.

Linting both the most recent reviewed submission and the new submission removes non-relevant changes from the diff and simplifies the review process. By normalizing formatting, removing unused parameters, stripping comments, and enforcing a consistent coding style, reviewers can focus on actual logic or API changes rather than stylistic differences.

---

## Requirements

- Node.js 18+ (supports ES modules)
- npm

---

## Installation

1. Clone or download this project.
2. Open a terminal in the project folder.
3. Install dependencies:

```bash
npm install
```

All required modules (ESLint, Prettier, Babel, PostCSS, JSON5, Adm-Zip, etc.) will be installed.

---

## Usage

Lint a WebExtension XPI (ZIP) file:

```bash
npm run linter <path-to-webextension-xpi-file>
```

Example:

```bash
npm run linter ../my-extension.xpi
```

The tool will:

1. Extract the ZIP to a temporary folder.
2. Lint and fix:
   - `.js` files (remove unused parameters, remove comments, run ESLint + Prettier)
   - `.css` files (remove all comments, format with Prettier)
   - `.html` files (format with Prettier)
   - `.json` files (format with JSON5, removes comments)
3. Repack everything into `linted_<originalname>.zip` (overwrites if exists).

---

## Notes

- The linter automatically handles BOMs in JSON/CSS/JS files.
- Parameters in JS functions will be removed if unused, including those prefixed with `_`.
- CSS comments (`/* ... */`) are fully removed.
- ESLint rules are loaded from `eslint.config.js`.

---

## Project Structure

```
review-linter/
├─ lint.js             # Main linter script
├─ package.json        # Dependencies and scripts
├─ eslint.config.js    # ESLint flat config (v9+)
├─ .prettierrc.js      # Prettier configuration
├─ tmp_extract/        # Temporary extraction folder (created at runtime)
└─ README.md
```

---

## License

Mozilla Public License, version 2.0 (MPL 2.0)
