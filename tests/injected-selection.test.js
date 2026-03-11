'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { clampCodeMirror6Selection } = require('../src/injected.js');

test('clamps codemirror6 selection to the new document length', () => {
  const selection = {
    main: {
      anchor: 48,
      head: 52
    }
  };

  assert.deepEqual(clampCodeMirror6Selection(selection, 17), {
    anchor: 17,
    head: 17
  });
});
