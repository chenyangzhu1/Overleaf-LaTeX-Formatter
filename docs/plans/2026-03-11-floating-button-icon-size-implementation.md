# Floating Button Icon Size Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the floating format button icon slightly smaller while keeping the button size and interaction behavior unchanged.

**Architecture:** Treat this as a visual-only change inside `src/content.js`. Guard the change with a focused test that checks the inline SVG size so the tweak stays intentional and minimal.

**Tech Stack:** Chrome Extension MV3, JavaScript, Node `node:test` + `assert/strict`

---

### Task 1: Add A Failing Test For Icon Size

**Files:**
- Create: `tests/content-ui.test.js`
- Modify: `src/content.js`

**Step 1: Write the failing test**

Add a test that reads `src/content.js` and asserts the inline SVG icon uses:

```js
assert.match(source, /width="16" height="16"/);
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/content-ui.test.js`
Expected: FAIL because the current source still uses `20`

**Step 3: Write minimal implementation**

Change the floating button inline SVG size from `20x20` to `16x16` in `src/content.js`.

**Step 4: Run test to verify it passes**

Run: `node --test tests/content-ui.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/content-ui.test.js src/content.js
git commit -m "style: reduce floating button icon size"
```

### Task 2: Run Full Verification

**Files:**
- No additional code changes required

**Step 1: Run the full test suite**

Run: `node --test tests/*.test.js`
Expected: PASS

**Step 2: Manual verification**

Check in Chrome that:

- the icon looks slightly smaller
- the circular button size feels unchanged
- drag and click behavior remain unchanged

**Step 3: Commit**

```bash
git add src/content.js tests/content-ui.test.js
git commit -m "test: cover floating button icon size"
```
