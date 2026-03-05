'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { pickBestFormatTarget } = require('../src/editor-target.js');

function makeCandidate({ id, type, text, visible = true, focused = false, languageHint = '', modeHint = '' }) {
  return {
    id,
    type,
    visible,
    focused,
    languageHint,
    modeHint,
    getValue() {
      return text;
    },
    setValue() {}
  };
}

test('prefers meaningful latex editor candidate over empty textarea', () => {
  const candidates = [
    makeCandidate({ id: 'ta-1', type: 'textarea', text: '', visible: true }),
    makeCandidate({
      id: 'mono-1',
      type: 'monaco',
      text: '\\begin{document}\n\\section{A}  \n\\end{document}\n',
      visible: true,
      languageHint: 'latex'
    })
  ];

  const selected = pickBestFormatTarget(candidates, (text) => text.replace(/[ \t]+$/gm, ''));

  assert.ok(selected, 'expected a selected candidate');
  assert.equal(selected.candidate.id, 'mono-1');
  assert.equal(selected.changed, true);
});

test('rejects non-latex textarea candidate even if formatter would change it', () => {
  const candidates = [
    makeCandidate({ id: 'ta-search', type: 'textarea', text: 'search term   ', visible: true }),
    makeCandidate({
      id: 'ace-1',
      type: 'ace',
      text: '\\begin{document}\n\\end{document}\n',
      visible: true,
      modeHint: 'latex'
    })
  ];

  const selected = pickBestFormatTarget(candidates, (text) => text.replace(/[ \t]+$/gm, ''));

  assert.ok(selected, 'expected a selected candidate');
  assert.equal(selected.candidate.id, 'ace-1');
});

test('returns highest scoring candidate when no formatting change is needed', () => {
  const candidates = [
    makeCandidate({ id: 'mono-1', type: 'monaco', text: '\\begin{document}\n\\end{document}', visible: true, languageHint: 'latex' }),
    makeCandidate({ id: 'mono-2', type: 'monaco', text: 'x', visible: false, languageHint: 'plaintext' })
  ];

  const selected = pickBestFormatTarget(candidates, (text) => text);

  assert.ok(selected, 'expected a selected candidate');
  assert.equal(selected.candidate.id, 'mono-1');
  assert.equal(selected.changed, false);
});

test('returns null for a single non-latex textarea candidate', () => {
  const candidates = [
    makeCandidate({ id: 'ta-search', type: 'textarea', text: 'query', visible: true })
  ];

  const selected = pickBestFormatTarget(candidates, (text) => text);

  assert.equal(selected, null);
});
