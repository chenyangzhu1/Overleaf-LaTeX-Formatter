'use strict';

(function bootstrap(root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.LatexFormatter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function buildFormatter() {
  const NO_FORMAT_ENV_NAMES = new Set(['verbatim', 'verbatim*', 'lstlisting', 'minted']);

  const BEGIN_RE = /\\begin\s*\{\s*([^{}]+?)\s*\}/g;
  const END_RE = /\\end\s*\{\s*([^{}]+?)\s*\}/g;
  const TOKEN_RE = /\\(begin|end)\s*\{\s*([^{}]+?)\s*\}/g;

  function normalizeLineEndings(text) {
    return text.replace(/\r\n?/g, '\n');
  }

  function trimTrailingWhitespace(line) {
    return line.replace(/[ \t]+$/g, '');
  }

  function splitCodeAndComment(line) {
    for (let i = 0; i < line.length; i += 1) {
      if (line[i] !== '%') {
        continue;
      }

      let backslashCount = 0;
      for (let j = i - 1; j >= 0 && line[j] === '\\'; j -= 1) {
        backslashCount += 1;
      }

      if (backslashCount % 2 === 0) {
        return {
          codePart: line.slice(0, i),
          commentPart: line.slice(i)
        };
      }
    }

    return {
      codePart: line,
      commentPart: ''
    };
  }

  function countMatches(regex, text) {
    regex.lastIndex = 0;
    let count = 0;

    while (regex.exec(text)) {
      count += 1;
    }

    return count;
  }

  function countLeadingEndCommands(trimmedCode) {
    let remaining = trimmedCode;
    let count = 0;

    while (true) {
      const match = remaining.match(/^\\end\s*\{\s*([^{}]+?)\s*\}/);
      if (!match) {
        break;
      }

      count += 1;
      remaining = remaining.slice(match[0].length).trimStart();
    }

    return count;
  }

  function isIfStart(trimmedCode) {
    return /^\\if(?:[A-Za-z@]*)\b/.test(trimmedCode);
  }

  function isElseStart(trimmedCode) {
    return /^\\else\b/.test(trimmedCode);
  }

  function isFiStart(trimmedCode) {
    return /^\\fi\b/.test(trimmedCode);
  }

  function isNoFormatActive(envStack) {
    for (let i = envStack.length - 1; i >= 0; i -= 1) {
      if (NO_FORMAT_ENV_NAMES.has(envStack[i])) {
        return true;
      }
    }

    return false;
  }

  function updateEnvironmentStack(envStack, codePart) {
    TOKEN_RE.lastIndex = 0;
    let match;

    while ((match = TOKEN_RE.exec(codePart)) !== null) {
      const type = match[1];
      const envName = match[2].trim().toLowerCase();

      if (!envName) {
        continue;
      }

      if (type === 'begin') {
        envStack.push(envName);
        continue;
      }

      for (let i = envStack.length - 1; i >= 0; i -= 1) {
        if (envStack[i] === envName) {
          envStack.splice(i, 1);
          break;
        }
      }
    }
  }

  function formatPlainLatexLines(lines, indent) {
    const outputLines = [];
    const envStack = [];
    let indentLevel = 0;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const originalLine = trimTrailingWhitespace(lines[lineIndex]);
      const trimmedCode = originalLine.trim();

      const startsElse = isElseStart(trimmedCode);
      const startsFi = isFiStart(trimmedCode);
      const startsIf = isIfStart(trimmedCode);
      const leadingEndCount = countLeadingEndCommands(trimmedCode);
      const dedentBefore = leadingEndCount + (startsElse ? 1 : 0) + (startsFi ? 1 : 0);

      const beginCount = countMatches(BEGIN_RE, originalLine);
      const endCount = countMatches(END_RE, originalLine);
      const trailingEndCount = Math.max(endCount - leadingEndCount, 0);

      function advanceIndentState() {
        const lineIndentLevel = Math.max(indentLevel - dedentBefore, 0);
        let nextIndent = lineIndentLevel + beginCount + (startsIf ? 1 : 0) + (startsElse ? 1 : 0) - trailingEndCount;
        if (nextIndent < 0) {
          nextIndent = 0;
        }

        indentLevel = nextIndent;
        return lineIndentLevel;
      }

      if (isNoFormatActive(envStack)) {
        outputLines.push(/^\\end\s*\{/.test(trimmedCode) ? trimmedCode : originalLine);
        if (trimmedCode !== '') {
          advanceIndentState();
        }
        updateEnvironmentStack(envStack, originalLine);
        continue;
      }

      if (trimmedCode === '') {
        outputLines.push('');
        updateEnvironmentStack(envStack, originalLine);
        continue;
      }

      const lineIndentLevel = advanceIndentState();
      outputLines.push(indent.repeat(lineIndentLevel) + originalLine.trimStart());
      updateEnvironmentStack(envStack, originalLine);
    }

    return outputLines;
  }

  function normalizeCommentContent(commentPart) {
    return trimTrailingWhitespace(commentPart.replace(/^% ?/, ''));
  }

  function formatCommentBlock(commentParts, baseIndentLevel, indent) {
    const commentBodies = commentParts.map((commentPart) => normalizeCommentContent(commentPart));
    const formattedBodies = formatPlainLatexLines(commentBodies, indent);

    return formattedBodies.map((line) => {
      const prefix = indent.repeat(baseIndentLevel) + '%';
      return line === '' ? prefix : `${prefix} ${line}`;
    });
  }

  function formatLatex(input, options) {
    const text = typeof input === 'string' ? input : '';
    const normalizedInput = normalizeLineEndings(text);
    const hasTrailingNewline = normalizedInput.endsWith('\n');
    const indent = options && typeof options.indent === 'string' && options.indent ? options.indent : '    ';

    const lines = normalizedInput.split('\n');
    if (hasTrailingNewline) {
      lines.pop();
    }

    const outputLines = [];
    const envStack = [];
    let indentLevel = 0;

    for (let lineIndex = 0; lineIndex < lines.length;) {
      const originalLine = lines[lineIndex];
      const { codePart, commentPart } = splitCodeAndComment(originalLine);
      const trimmedCode = codePart.trim();

      if (trimmedCode === '' && commentPart) {
        const commentParts = [];
        const baseIndentLevel = indentLevel;

        while (lineIndex < lines.length) {
          const nextLine = lines[lineIndex];
          const nextParts = splitCodeAndComment(nextLine);

          if (nextParts.codePart.trim() !== '' || !nextParts.commentPart) {
            break;
          }

          commentParts.push(nextParts.commentPart);
          lineIndex += 1;
        }

        outputLines.push(...formatCommentBlock(commentParts, baseIndentLevel, indent));
        continue;
      }

      const startsElse = isElseStart(trimmedCode);
      const startsFi = isFiStart(trimmedCode);
      const startsIf = isIfStart(trimmedCode);
      const leadingEndCount = countLeadingEndCommands(trimmedCode);
      const dedentBefore = leadingEndCount + (startsElse ? 1 : 0) + (startsFi ? 1 : 0);

      const beginCount = countMatches(BEGIN_RE, codePart);
      const endCount = countMatches(END_RE, codePart);
      const trailingEndCount = Math.max(endCount - leadingEndCount, 0);

      function advanceIndentState() {
        const lineIndentLevel = Math.max(indentLevel - dedentBefore, 0);
        let nextIndent = lineIndentLevel + beginCount + (startsIf ? 1 : 0) + (startsElse ? 1 : 0) - trailingEndCount;
        if (nextIndent < 0) {
          nextIndent = 0;
        }

        indentLevel = nextIndent;
        return lineIndentLevel;
      }

      if (isNoFormatActive(envStack)) {
        outputLines.push(originalLine);
        if (trimmedCode !== '') {
          advanceIndentState();
        }
        updateEnvironmentStack(envStack, codePart);
        lineIndex += 1;
        continue;
      }

      if (trimmedCode === '') {
        outputLines.push(commentPart ? originalLine : '');
        updateEnvironmentStack(envStack, codePart);
        lineIndex += 1;
        continue;
      }

      const lineIndentLevel = advanceIndentState();
      let formattedLine = indent.repeat(lineIndentLevel) + trimTrailingWhitespace(codePart.trimStart());

      if (commentPart) {
        const formattedComment = formatCommentBlock([commentPart], 0, indent)[0];
        const normalizedComment = formattedComment.slice(2);
        formattedLine += normalizedComment ? ` % ${normalizedComment}` : ' %';
      }

      outputLines.push(formattedLine);
      updateEnvironmentStack(envStack, codePart);
      lineIndex += 1;
    }

    let formatted = outputLines.join('\n');
    if (hasTrailingNewline) {
      formatted += '\n';
    }

    return formatted;
  }

  return {
    formatLatex
  };
});
