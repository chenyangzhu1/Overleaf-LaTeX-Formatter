# Overleaf LaTeX Formatter Chrome Extension Design

## Goal

Build a Chrome extension for Overleaf that formats the entire active LaTeX file on demand. Formatting must be triggerable from both the browser toolbar icon and an in-page `Format` button.

## Scope

- Target browser: Chrome (Manifest V3)
- Target site: Overleaf web app (`https://www.overleaf.com/*`)
- Target content: full text of the active editor document
- Local-only processing: no network calls, no remote formatting service

## Architecture

### Extension Components

- `manifest.json`
  - Declares MV3 extension metadata, permissions, content script registration, and web-accessible injected scripts.
- `src/background.js`
  - Listens to toolbar action click.
  - Sends a format trigger message to the current tab.
- `src/content.js`
  - Runs on Overleaf pages.
  - Injects page-context script files.
  - Adds a floating `Format` button in page UI.
  - Forwards toolbar/page button actions to injected runtime.
  - Displays success/error toasts.
- `src/injected.js`
  - Executes in page context.
  - Detects active Overleaf editor (Monaco first, Ace fallback).
  - Reads entire editor content, runs formatter, writes full replacement.
- `src/formatter.js`
  - Pure JavaScript formatter for LaTeX.
  - Usable in browser (global export) and tests (CommonJS export).

### Message Flow

1. Toolbar click (`background.js`) -> send `LF_TRIGGER_FORMAT` to tab.
2. `content.js` receives message or button click -> posts `LF_RUN_FORMAT` to page.
3. `injected.js` handles request -> formats current editor text -> posts `LF_FORMAT_RESULT`.
4. `content.js` displays toast for result.

## Formatting Rules (v1)

- Normalize line endings to `\n`
- Remove trailing whitespace on normal lines
- Indent based on:
  - `\begin{...}` / `\end{...}`
  - basic `\if...`, `\else`, `\fi`
- Preserve blank lines
- Skip content rewriting inside safe no-format environments:
  - `verbatim`, `Verbatim`, `lstlisting`, `minted`

## Error Handling

- If no compatible editor is detected, return an explicit error message.
- If formatter runtime is missing, return explicit error.
- If content script is unavailable (non-Overleaf pages), extension does nothing silently.

## Security & Privacy

- No remote API calls.
- File content stays in browser context.
- Host access limited to Overleaf domain match patterns.

## Testing Strategy

- Unit tests for `src/formatter.js` with Node built-in test runner.
- Validate:
  - indentation around environments
  - handling of comments and blank lines
  - skip behavior for no-format environments
  - `if/else/fi` indentation baseline behavior

## Known Limitations (v1)

- Does not attempt semantic AST formatting; rule-based indentation only.
- Complex conditional macro patterns beyond basic `if/else/fi` are not deeply parsed.
- Cursor/selection restoration is best effort and editor-dependent.
