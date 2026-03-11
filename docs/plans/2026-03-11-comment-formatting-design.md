# Comment Formatting Design

## Goal

Format commented LaTeX content together with normal LaTeX code, while keeping comments intact and preventing comment-only structure from changing the indentation state of real code.

## Decision

- Format standalone comment lines as part of the formatter output instead of preserving them verbatim.
- Keep real-code indentation state separate from comment-only indentation state.
- Treat consecutive standalone comment lines as their own formatting stream so commented-out environments can indent correctly inside the comment block.
- Format inline comments after `%` for spacing and indentation, but do not let inline comment tokens mutate the indentation state of surrounding real code.

## Rationale

- The current formatter now preserves comments, but it leaves commented-out LaTeX blocks visually unformatted.
- Users often comment out LaTeX environments temporarily and still want them to remain readable.
- Sharing one indentation state between real code and comments is too risky because comment-only `\begin` and `\end` tokens can corrupt later real-code indentation.
- Splitting the states keeps the behavior predictable: comments are formatted, but real code continues to follow only real code structure.

## Behavior Rules

- Standalone comment lines are reformatted and keep their `%` marker.
- Consecutive standalone comment lines behave like a separate LaTeX block. Example:
  - `% \begin{itemize}`
  - `% \item A`
  - `% \end{itemize}`
  becomes a properly indented comment block.
- Inline comments are also reformatted. Example:
  - `\section{A} %    \begin{itemize}`
  becomes a normalized inline comment form.
- Comment text is never deleted. Only indentation and surrounding whitespace are normalized.
- Comment-only structure never changes the indentation level of later non-comment code.

## Scope

- Modify `src/formatter.js`
- Add regression tests in `tests/formatter.test.js`
- Keep the existing selection-clamping fix and tests unchanged

## Out Of Scope

- Rewriting comment wording
- Parsing comment text semantically beyond existing formatter token rules
- Changing editor integration behavior outside the formatter itself
