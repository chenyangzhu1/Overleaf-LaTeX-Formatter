'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { isFormatShortcut, createShortcutArbiter } = require('../src/shortcut.js');

function makeEvent(overrides) {
  return {
    key: 'u',
    metaKey: false,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    isComposing: false,
    ...overrides
  };
}

test('matches mac shortcut Command+Shift+U', () => {
  assert.equal(isFormatShortcut(makeEvent({ key: 'u', metaKey: true, shiftKey: true })), true);
  assert.equal(isFormatShortcut(makeEvent({ key: 'U', metaKey: true, shiftKey: true })), true);
});

test('matches fallback shortcut Alt+Shift+U', () => {
  assert.equal(isFormatShortcut(makeEvent({ key: 'u', altKey: true, shiftKey: true })), true);
});

test('rejects partial or noisy combinations', () => {
  assert.equal(isFormatShortcut(makeEvent({ key: 'u', metaKey: true })), false);
  assert.equal(isFormatShortcut(makeEvent({ key: 'u', metaKey: true, shiftKey: true, altKey: true })), false);
  assert.equal(isFormatShortcut(makeEvent({ key: 'u', metaKey: true, shiftKey: true, ctrlKey: true })), false);
  assert.equal(isFormatShortcut(makeEvent({ key: 'x', metaKey: true, shiftKey: true })), false);
});

test('ignores composing input state', () => {
  assert.equal(isFormatShortcut(makeEvent({ key: 'u', metaKey: true, shiftKey: true, isComposing: true })), false);
});

test('arbiter runs fallback when command handler does not fire', () => {
  const arbiter = createShortcutArbiter({ fallbackDelayMs: 200, suppressCommandAfterFallbackMs: 500 });

  arbiter.noteShortcutPressed(1000);

  assert.equal(arbiter.shouldRunFallback(1100), false);
  assert.equal(arbiter.shouldRunFallback(1201), true);
  assert.equal(arbiter.shouldRunFallback(1300), false);
});

test('arbiter suppresses fallback when command handler fires in time', () => {
  const arbiter = createShortcutArbiter({ fallbackDelayMs: 200, suppressCommandAfterFallbackMs: 500 });

  arbiter.noteShortcutPressed(1000);
  assert.equal(arbiter.noteShortcutCommand(1100), true);
  assert.equal(arbiter.shouldRunFallback(1301), false);
});

test('arbiter ignores duplicate command right after fallback execution', () => {
  const arbiter = createShortcutArbiter({ fallbackDelayMs: 200, suppressCommandAfterFallbackMs: 500 });

  arbiter.noteShortcutPressed(1000);
  assert.equal(arbiter.shouldRunFallback(1201), true);
  assert.equal(arbiter.noteShortcutCommand(1300), false);
  assert.equal(arbiter.noteShortcutCommand(1800), true);
});
