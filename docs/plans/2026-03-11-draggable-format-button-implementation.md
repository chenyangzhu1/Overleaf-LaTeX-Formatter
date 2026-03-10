# Draggable Floating Format Button Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current fixed text `Format` button with a draggable icon-only floating action button that starts in the bottom-left corner, snaps to the nearest horizontal edge, and restores its saved position across reloads.

**Architecture:** Keep formatting behavior unchanged and confine the feature to the content-script UI layer. Extract button position geometry into a pure helper module so snapping and clamping can be tested independently from DOM event handling. Persist only minimal position state through `chrome.storage.local`.

**Tech Stack:** Chrome Extension MV3, JavaScript, Node `node:test` + `assert/strict`

---

### Task 1: Add Storage Permission And Position Helper Tests

**Files:**
- Modify: `manifest.json`
- Modify: `tests/manifest.test.js`
- Create: `tests/floating-button-position.test.js`

**Step 1: Write the failing test**

Add a manifest assertion for the `storage` permission and create helper tests that expect:

```js
const state = getDefaultFloatingButtonState({ width: 1200, height: 800 }, 54, 20);

assert.deepEqual(state, {
  side: 'left',
  left: 20,
  top: 726
});
```

Add snapping assertions such as:

```js
const state = snapFloatingButtonState(
  { left: 840, top: 200 },
  { width: 1200, height: 800 },
  54,
  20
);

assert.equal(state.side, 'right');
assert.equal(state.left, 1126);
assert.equal(state.top, 200);
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/manifest.test.js tests/floating-button-position.test.js`
Expected: FAIL because the helper module does not exist and `manifest.json` does not include `storage`

**Step 3: Write minimal implementation**

- Add `"storage"` to `manifest.json.permissions`
- Create `src/floating-button-position.js` exporting:
  - `getDefaultFloatingButtonState`
  - `clampFloatingButtonState`
  - `snapFloatingButtonState`
  - `resolveStoredFloatingButtonState`

**Step 4: Run test to verify it passes**

Run: `node --test tests/manifest.test.js tests/floating-button-position.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add manifest.json src/floating-button-position.js tests/manifest.test.js tests/floating-button-position.test.js
git commit -m "feat: add floating button position helpers"
```

### Task 2: Replace The In-Page Button UI And Add Drag Behavior

**Files:**
- Modify: `src/content.js`

**Step 1: Write the failing test**

Add a new test for the position helper if needed to capture the drag-release snap rule more precisely, for example:

```js
const state = snapFloatingButtonState(
  { left: 380, top: 900 },
  { width: 640, height: 480 },
  54,
  20
);

assert.deepEqual(state, {
  side: 'right',
  left: 566,
  top: 406
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/floating-button-position.test.js`
Expected: FAIL until clamping and snapping exactly match the intended drag behavior

**Step 3: Write minimal implementation**

Update `src/content.js` to:

- import the new helper by page-injecting `src/floating-button-position.js` before `src/content.js` logic uses it in CommonJS/browser-compatible form
- replace the text button with an icon-only circular floating button
- show a hover tooltip with `Format LaTeX`
- separate click from drag using a movement threshold
- clamp movement inside the viewport
- snap to the nearest horizontal edge on pointer release
- persist snapped position with `chrome.storage.local`
- restore the saved position on page load
- re-clamp on `resize`

Keep:

- `requestTabBroadcast('button')`
- existing toast handling
- existing shortcut flow
- existing injection flow

**Step 4: Run test to verify it passes**

Run: `node --test tests/floating-button-position.test.js tests/*.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/content.js
git commit -m "feat: add draggable floating format button"
```

### Task 3: Final Verification And Docs Alignment

**Files:**
- Modify: `README.md`

**Step 1: Write the failing test**

No new automated test is required. Add a manual verification checklist to README usage notes.

**Step 2: Run test to verify current state**

Run: `node --test tests/*.test.js`
Expected: PASS

**Step 3: Write minimal implementation**

Update README to mention:

- floating icon-only button
- default bottom-left placement
- drag, snap, and saved position behavior

**Step 4: Run final verification**

Run: `node --test tests/*.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add README.md
git commit -m "docs: document floating format button behavior"
```
