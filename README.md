# Overleaf LaTeX Formatter (Chrome Extension)

A Chrome extension for Overleaf that formats the entire LaTeX file in the active editor with one click.

## Features

- Supports two trigger methods:
  - Click the extension icon in the Chrome toolbar
  - Click the floating format button on the Overleaf page
- Supports keyboard shortcut trigger (default on macOS: `Command+Shift+U`)
- Processes content locally in the browser only (no document upload)
- The floating button starts in the bottom-left corner, can be dragged, snaps to the nearest side, and remembers its last position
- Current formatting rules:
  - Normalize line endings to `\n`
  - Remove trailing whitespace on normal lines
  - Indent based on `\begin{...}` / `\end{...}` and basic `\if...` / `\else` / `\fi` (default: 4 spaces)
  - Keep content unchanged inside `verbatim`, `Verbatim`, `lstlisting`, and `minted` environments

## Project Structure

- `manifest.json`: Extension manifest
- `src/background.js`: Handles toolbar icon and command triggers
- `src/content.js`: Injects scripts, renders page button, and shows toasts
- `src/floating-button-position.js`: Floating button geometry and drag-threshold helpers
- `src/editor-target.js`: Selects the most likely LaTeX editor target from candidates
- `src/injected.js`: Reads/writes editor content in page context
- `src/formatter.js`: Core formatter logic
- `src/shortcut.js`: Shortcut detection and de-duplication logic
- `icons/*.png`: Extension icons (16/32/48/128)
- `scripts/package.sh`: One-command packaging script
- `tests/*.test.js`: Unit tests

## Installation (Developer Mode)

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this project root directory (the one containing `manifest.json`)

## Usage

1. Open an Overleaf project and enter any LaTeX editor page
2. Trigger formatting by one of the following:
   - Click the extension icon
   - Click the floating format button in the page
   - Press `Command+Shift+U` (macOS)
3. The floating button appears as a draggable icon-only bubble in the bottom-left corner by default
4. Dragging the button lets you reposition it; releasing snaps it to the left or right edge and saves that position
5. The extension formats the full content of the active editor and shows a toast in the top-right corner

## Testing

Run in project root:

`node --test tests/*.test.js`

## Packaging (for Chrome Web Store)

Run in project root:

`./scripts/package.sh`

Generated file:

- `release/overleaf-latex-formatter-v<version>.zip`

Notes:

- `manifest.json` is placed at the ZIP root (required by Chrome Web Store)
- Bump `version` in `manifest.json` before each new release

## Store Asset Checklist

- `128x128` app icon (already included in this project)
- At least 1 store screenshot (prefer real Overleaf usage screenshots)
- `440x280` small promo tile (optional but recommended)

## Known Limitations

- Rule-based formatting (not full LaTeX AST formatting)
- Complex macros and unconventional structures may not match all personal styles
- Editor support prioritizes Monaco/Ace/CodeMirror, with `textarea` fallback

## Troubleshooting

- If you see `Could not detect LaTeX editor target`, click inside the Overleaf editor and retry
- After updates, reload the extension at `chrome://extensions/` and refresh the Overleaf page
