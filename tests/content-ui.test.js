'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('floating button uses a slightly reduced inline icon size', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'content.js'), 'utf8');

  assert.match(source, /width="16" height="16"/);
});

test('floating button defines a visible keyboard focus treatment', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'content.js'), 'utf8');

  assert.match(source, /button\.addEventListener\('focus'/);
  assert.match(source, /button\.addEventListener\('blur'/);
});
