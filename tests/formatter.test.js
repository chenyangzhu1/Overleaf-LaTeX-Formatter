'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { formatLatex } = require('../src/formatter.js');

test('exports formatLatex function', () => {
  assert.equal(typeof formatLatex, 'function');
});

test('indents nested environments', () => {
  const input = [
    '\\begin{document}',
    '\\begin{itemize}',
    '\\item A',
    '\\end{itemize}',
    '\\end{document}'
  ].join('\n');

  const output = formatLatex(input);

  assert.equal(
    output,
    [
      '\\begin{document}',
      '    \\begin{itemize}',
      '        \\item A',
      '    \\end{itemize}',
      '\\end{document}'
    ].join('\n')
  );
});

test('keeps content unchanged inside no-format environments', () => {
  const input = [
    '\\begin{document}',
    '\\begin{minted}{python}',
    'def   x():',
    '    return  1',
    '\\end{minted}',
    '\\end{document}'
  ].join('\n');

  const output = formatLatex(input);

  assert.equal(
    output,
    [
      '\\begin{document}',
      '    \\begin{minted}{python}',
      'def   x():',
      '    return  1',
      '\\end{minted}',
      '\\end{document}'
    ].join('\n')
  );
});

test('supports basic if else fi indentation', () => {
  const input = [
    '\\ifdefined\\foo',
    '\\textbf{A}',
    '\\else',
    '\\textit{B}',
    '\\fi'
  ].join('\n');

  const output = formatLatex(input);

  assert.equal(
    output,
    [
      '\\ifdefined\\foo',
      '    \\textbf{A}',
      '\\else',
      '    \\textit{B}',
      '\\fi'
    ].join('\n')
  );
});

test('normalizes line endings and trims trailing whitespace on normal lines', () => {
  const input = '\\begin{document}\r\n\\section{A}   \r\n\\end{document}\r\n';

  const output = formatLatex(input);

  assert.equal(output, '\\begin{document}\n    \\section{A}\n\\end{document}\n');
});

test('preserves standalone comments while formatting latex around them', () => {
  const input = [
    '\\begin{document}',
    '  % keep this comment exactly',
    '\\section{A}',
    '%leave this one too',
    '\\end{document}'
  ].join('\n');

  const output = formatLatex(input);

  assert.equal(
    output,
    [
      '\\begin{document}',
      '  % keep this comment exactly',
      '    \\section{A}',
      '%leave this one too',
      '\\end{document}'
    ].join('\n')
  );
});

test('preserves inline comment text when reindenting latex code', () => {
  const input = [
    '\\begin{document}',
    ' \\section{A}   % keep spacing before comment',
    '\\end{document}'
  ].join('\n');

  const output = formatLatex(input);

  assert.equal(
    output,
    [
      '\\begin{document}',
      '    \\section{A}   % keep spacing before comment',
      '\\end{document}'
    ].join('\n')
  );
});
