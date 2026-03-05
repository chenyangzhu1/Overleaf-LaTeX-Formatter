# Overleaf LaTeX Formatter Chrome Extension Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Chrome extension for Overleaf that formats the entire active LaTeX document via both toolbar click and in-page `Format` button.

**Architecture:** Use MV3 with a background action handler, a content script for UI/message bridging, and an injected page-context runner for editor access (Monaco/Ace). Keep formatting logic in a pure shared module and validate with Node unit tests.

**Tech Stack:** Chrome Extension Manifest V3, JavaScript, Node `node:test` + `assert/strict`

---

### Task 1: Scaffold Extension Files

**Files:**
- Create: `manifest.json`
- Create: `src/background.js`
- Create: `src/content.js`
- Create: `src/injected.js`
- Create: `src/formatter.js`
- Create: `README.md`

**Step 1: Write the failing test**

Create placeholder formatter test expecting a callable formatter API that does not exist yet.

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { formatLatex } from '../src/formatter.js';

test('formatter exports formatLatex', () => {
  assert.equal(typeof formatLatex, 'function');
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/formatter.test.js`
Expected: FAIL because `src/formatter.js` is missing or export missing.

**Step 3: Write minimal implementation**

Create extension scaffold and formatter module with minimal exportable `formatLatex` function.

**Step 4: Run test to verify it passes**

Run: `node --test tests/formatter.test.js`
Expected: PASS for export test.

**Step 5: Commit**

```bash
git add manifest.json src/background.js src/content.js src/injected.js src/formatter.js README.md tests/formatter.test.js
git commit -m "feat: scaffold overleaf formatter chrome extension"
```

### Task 2: Implement Formatter Rules (Core Behavior)

**Files:**
- Modify: `src/formatter.js`
- Modify: `tests/formatter.test.js`

**Step 1: Write the failing test**

Add tests for:
- environment indentation
- no-format environment passthrough
- basic if/else/fi indentation
- line ending normalization/trailing whitespace cleanup

**Step 2: Run test to verify it fails**

Run: `node --test tests/formatter.test.js`
Expected: FAIL on new behavior assertions.

**Step 3: Write minimal implementation**

Implement rule-based formatter with:
- EOL normalize
- indent stack logic
- no-format environment bypass

**Step 4: Run test to verify it passes**

Run: `node --test tests/formatter.test.js`
Expected: PASS for all formatter tests.

**Step 5: Commit**

```bash
git add src/formatter.js tests/formatter.test.js
git commit -m "feat: implement latex formatter core rules"
```

### Task 3: Wire Overleaf Integration (Toolbar + In-Page Button)

**Files:**
- Modify: `src/background.js`
- Modify: `src/content.js`
- Modify: `src/injected.js`
- Modify: `manifest.json`

**Step 1: Write the failing test**

Add integration smoke test for message contract helpers exposed from injected logic (if extracted), or at minimum add formatter-driven assertions that support integration path.

**Step 2: Run test to verify it fails**

Run: `node --test tests/formatter.test.js`
Expected: FAIL for new helper assumptions (if any).

**Step 3: Write minimal implementation**

Implement:
- action click trigger from background
- content script button + message bridge + toast feedback
- page script editor detection and full-document replace

**Step 4: Run test to verify it passes**

Run: `node --test tests/formatter.test.js`
Expected: PASS (unit tests), manual extension test succeeds in Overleaf.

**Step 5: Commit**

```bash
git add manifest.json src/background.js src/content.js src/injected.js
git commit -m "feat: add overleaf editor integration and triggers"
```

### Task 4: Documentation + Final Verification

**Files:**
- Modify: `README.md`

**Step 1: Write the failing test**

No additional code test; define manual acceptance checklist in README.

**Step 2: Run test to verify current state**

Run: `node --test tests/formatter.test.js`
Expected: PASS.

**Step 3: Write minimal implementation**

Document:
- install unpacked extension in Chrome
- permissions and privacy
- usage for both triggers
- known limitations

**Step 4: Run final verification**

Run: `node --test tests/formatter.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add README.md
git commit -m "docs: add usage and limitations for overleaf formatter extension"
```
