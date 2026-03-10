'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getDefaultFloatingButtonState,
  clampFloatingButtonPosition,
  clampFloatingButtonState,
  snapFloatingButtonState,
  resolveStoredFloatingButtonState,
  didPointerMoveBeyondThreshold,
  shouldApplyResolvedFloatingButtonState,
  shouldSuppressButtonClickAfterPointerEnd
} = require('../src/floating-button-position.js');

const VIEWPORT = { width: 1200, height: 800 };
const BUTTON_SIZE = 54;
const MARGIN = 20;

test('returns bottom-left default floating button state', () => {
  assert.deepEqual(getDefaultFloatingButtonState(VIEWPORT, BUTTON_SIZE, MARGIN), {
    side: 'left',
    left: 20,
    top: 726
  });
});

test('snaps to left edge when released on the left half', () => {
  assert.deepEqual(
    snapFloatingButtonState(
      { left: 140, top: 200 },
      VIEWPORT,
      BUTTON_SIZE,
      MARGIN
    ),
    {
      side: 'left',
      left: 20,
      top: 200
    }
  );
});

test('snaps to right edge when released on the right half', () => {
  assert.deepEqual(
    snapFloatingButtonState(
      { left: 840, top: 200 },
      VIEWPORT,
      BUTTON_SIZE,
      MARGIN
    ),
    {
      side: 'right',
      left: 1126,
      top: 200
    }
  );
});

test('clamps restored state to the visible viewport bounds', () => {
  assert.deepEqual(
    clampFloatingButtonState(
      { side: 'right', left: 5000, top: 9000 },
      { width: 640, height: 480 },
      BUTTON_SIZE,
      MARGIN
    ),
    {
      side: 'right',
      left: 566,
      top: 406
    }
  );
});

test('clamps free drag position without snapping sides early', () => {
  assert.deepEqual(
    clampFloatingButtonPosition(
      { left: -50, top: 9000 },
      { width: 640, height: 480 },
      BUTTON_SIZE,
      MARGIN
    ),
    {
      left: 20,
      top: 406
    }
  );
});

test('falls back to default state for malformed stored values', () => {
  assert.deepEqual(
    resolveStoredFloatingButtonState(
      { side: 'middle', top: 'nope' },
      VIEWPORT,
      BUTTON_SIZE,
      MARGIN
    ),
    {
      side: 'left',
      left: 20,
      top: 726
    }
  );
});

test('detects when pointer movement should become a drag', () => {
  assert.equal(
    didPointerMoveBeyondThreshold(
      { x: 20, y: 20 },
      { x: 23, y: 24 },
      6
    ),
    false
  );

  assert.equal(
    didPointerMoveBeyondThreshold(
      { x: 20, y: 20 },
      { x: 25, y: 25 },
      6
    ),
    true
  );
});

test('skips applying restored position after live user interaction', () => {
  assert.equal(shouldApplyResolvedFloatingButtonState(2, 2), true);
  assert.equal(shouldApplyResolvedFloatingButtonState(2, 3), false);
});

test('does not keep click suppression after pointercancel', () => {
  assert.equal(shouldSuppressButtonClickAfterPointerEnd(true, 'pointerup'), true);
  assert.equal(shouldSuppressButtonClickAfterPointerEnd(true, 'pointercancel'), false);
  assert.equal(shouldSuppressButtonClickAfterPointerEnd(false, 'pointerup'), false);
});
