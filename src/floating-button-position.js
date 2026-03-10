'use strict';

(function bootstrap(root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.LatexFloatingButtonPosition = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function buildFloatingButtonPosition() {
  function getViewportMetrics(viewport) {
    const width = Number.isFinite(viewport && viewport.width) ? viewport.width : 0;
    const height = Number.isFinite(viewport && viewport.height) ? viewport.height : 0;

    return {
      width,
      height
    };
  }

  function getBounds(viewport, buttonSize, margin) {
    const metrics = getViewportMetrics(viewport);
    const size = Number.isFinite(buttonSize) ? buttonSize : 0;
    const inset = Number.isFinite(margin) ? margin : 0;

    return {
      left: inset,
      top: inset,
      right: Math.max(inset, metrics.width - inset - size),
      bottom: Math.max(inset, metrics.height - inset - size)
    };
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function clampFloatingButtonPosition(position, viewport, buttonSize, margin) {
    const bounds = getBounds(viewport, buttonSize, margin);

    return {
      left: clamp(
        Number.isFinite(position && position.left) ? position.left : bounds.left,
        bounds.left,
        bounds.right
      ),
      top: clamp(
        Number.isFinite(position && position.top) ? position.top : bounds.bottom,
        bounds.top,
        bounds.bottom
      )
    };
  }

  function getDefaultFloatingButtonState(viewport, buttonSize, margin) {
    const bounds = getBounds(viewport, buttonSize, margin);

    return {
      side: 'left',
      left: bounds.left,
      top: bounds.bottom
    };
  }

  function clampFloatingButtonState(state, viewport, buttonSize, margin) {
    const bounds = getBounds(viewport, buttonSize, margin);
    const side = state && state.side === 'right' ? 'right' : 'left';
    const position = clampFloatingButtonPosition(state, viewport, buttonSize, margin);

    return {
      side,
      left: side === 'right' ? bounds.right : bounds.left,
      top: position.top
    };
  }

  function snapFloatingButtonState(position, viewport, buttonSize, margin) {
    const metrics = getViewportMetrics(viewport);
    const size = Number.isFinite(buttonSize) ? buttonSize : 0;
    const left = Number.isFinite(position && position.left) ? position.left : 0;
    const centerX = left + size / 2;
    const side = centerX >= metrics.width / 2 ? 'right' : 'left';

    return clampFloatingButtonState({ side, top: position && position.top }, viewport, buttonSize, margin);
  }

  function resolveStoredFloatingButtonState(rawValue, viewport, buttonSize, margin) {
    if (!rawValue || (rawValue.side !== 'left' && rawValue.side !== 'right') || !Number.isFinite(rawValue.top)) {
      return getDefaultFloatingButtonState(viewport, buttonSize, margin);
    }

    return clampFloatingButtonState(rawValue, viewport, buttonSize, margin);
  }

  function didPointerMoveBeyondThreshold(startPoint, currentPoint, threshold) {
    const startX = Number.isFinite(startPoint && startPoint.x) ? startPoint.x : 0;
    const startY = Number.isFinite(startPoint && startPoint.y) ? startPoint.y : 0;
    const currentX = Number.isFinite(currentPoint && currentPoint.x) ? currentPoint.x : 0;
    const currentY = Number.isFinite(currentPoint && currentPoint.y) ? currentPoint.y : 0;
    const limit = Number.isFinite(threshold) ? threshold : 0;

    return Math.hypot(currentX - startX, currentY - startY) > limit;
  }

  function shouldApplyResolvedFloatingButtonState(restoreInteractionVersion, currentInteractionVersion) {
    return restoreInteractionVersion === currentInteractionVersion;
  }

  function shouldSuppressButtonClickAfterPointerEnd(wasDragging, eventType) {
    return !!wasDragging && eventType !== 'pointercancel';
  }

  return {
    getDefaultFloatingButtonState,
    clampFloatingButtonPosition,
    clampFloatingButtonState,
    snapFloatingButtonState,
    resolveStoredFloatingButtonState,
    didPointerMoveBeyondThreshold,
    shouldApplyResolvedFloatingButtonState,
    shouldSuppressButtonClickAfterPointerEnd
  };
});
