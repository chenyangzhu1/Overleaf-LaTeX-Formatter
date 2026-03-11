# Comment Formatting Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Format commented LaTeX content, including commented-out blocks and inline comment content, without letting comment-only structure affect the indentation of real LaTeX code.

**Architecture:** Keep the existing real-code formatter flow in `src/formatter.js`, but split comment formatting into a separate path. Standalone comment blocks get their own indentation state. Inline comment content is normalized independently after the real code portion is formatted. The change is guarded by focused formatter regression tests first, then verified against the full suite.

**Tech Stack:** Chrome Extension MV3, JavaScript, Node `node:test` + `assert/strict`

---

### Task 1: Add Failing Tests For Comment Formatting

**Files:**
- Modify: `tests/formatter.test.js`
- Test: `tests/formatter.test.js`

**Step 1: Write the failing tests**

Add tests that cover:

```js
test('formats commented-out latex blocks with their own indentation', () => {});
test('formats inline comment latex without changing later real-code indentation', () => {});
test('formats plain text comments by normalizing surrounding whitespace only', () => {});
```

Use inputs that prove:
- `% \begin{itemize}` / `% \item A` / `% \end{itemize}` become an indented comment block
- `\section{A} % \begin{itemize}` formats the inline comment but the next real line does not get extra indentation
- `%   note here   ` becomes `% note here`

**Step 2: Run test to verify it fails**

Run: `node --test tests/formatter.test.js`
Expected: FAIL because standalone comment blocks are not currently reformatted and inline comment formatting is not normalized.

**Step 3: Commit**

```bash
git add tests/formatter.test.js
git commit -m "test: cover commented latex formatting"
```

### Task 2: Implement Minimal Formatter Changes

**Files:**
- Modify: `src/formatter.js`
- Test: `tests/formatter.test.js`

**Step 1: Write minimal implementation**

Update `src/formatter.js` to:
- distinguish standalone comment lines from normal blank lines
- maintain a comment-only indentation state for consecutive standalone comment blocks
- normalize standalone comment output to `% <formatted content>` when content exists
- normalize inline comments to `code % <formatted content>`
- ensure comment-only `\begin` / `\end` tokens do not mutate the real-code indentation state

Keep the no-format environment behavior for real code intact unless the comment block itself is being formatted.

**Step 2: Run targeted tests to verify they pass**

Run: `node --test tests/formatter.test.js`
Expected: PASS

**Step 3: Commit**

```bash
git add src/formatter.js tests/formatter.test.js
git commit -m "feat: format commented latex content"
```

### Task 3: Run Full Verification

**Files:**
- No additional code changes required

**Step 1: Run the full test suite**

Run: `node --test tests/*.test.js`
Expected: PASS

**Step 2: Manual verification**

Check in Chrome on Overleaf that:
- commented-out LaTeX blocks are reformatted
- inline comment content is normalized
- normal code indentation is unchanged after comment-heavy sections
- no `selection point outside the documents` error appears

**Step 3: Commit**

```bash
git add src/formatter.js tests/formatter.test.js
git commit -m "test: verify commented latex formatting behavior"
```
