'use strict';

(function bootstrap(root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.LatexShortcut = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function buildShortcut() {
  const DEFAULT_FALLBACK_DELAY_MS = 240;
  const DEFAULT_SUPPRESS_COMMAND_AFTER_FALLBACK_MS = 500;

  function normalizedKey(event) {
    if (!event || typeof event.key !== 'string') {
      return '';
    }

    return event.key.toLowerCase();
  }

  function isMacShortcut(event) {
    return !!event.metaKey && !!event.shiftKey && !event.altKey && !event.ctrlKey;
  }

  function isFallbackShortcut(event) {
    return !!event.altKey && !!event.shiftKey && !event.metaKey && !event.ctrlKey;
  }

  function isFormatShortcut(event) {
    if (!event || event.isComposing) {
      return false;
    }

    if (normalizedKey(event) !== 'u') {
      return false;
    }

    return isMacShortcut(event) || isFallbackShortcut(event);
  }

  function createShortcutArbiter(options) {
    const config = options || {};
    const fallbackDelayMs = Number.isFinite(config.fallbackDelayMs) ? config.fallbackDelayMs : DEFAULT_FALLBACK_DELAY_MS;
    const suppressCommandAfterFallbackMs = Number.isFinite(config.suppressCommandAfterFallbackMs)
      ? config.suppressCommandAfterFallbackMs
      : DEFAULT_SUPPRESS_COMMAND_AFTER_FALLBACK_MS;

    let pendingShortcutAt = 0;
    let lastCommandAt = 0;
    let lastFallbackAt = 0;

    function noteShortcutPressed(now) {
      const ts = Number.isFinite(now) ? now : Date.now();
      pendingShortcutAt = ts;
    }

    function noteShortcutCommand(now) {
      const ts = Number.isFinite(now) ? now : Date.now();
      lastCommandAt = ts;
      pendingShortcutAt = 0;

      return ts - lastFallbackAt >= suppressCommandAfterFallbackMs;
    }

    function shouldRunFallback(now) {
      const ts = Number.isFinite(now) ? now : Date.now();
      if (!pendingShortcutAt) {
        return false;
      }

      if (ts - pendingShortcutAt < fallbackDelayMs) {
        return false;
      }

      if (lastCommandAt >= pendingShortcutAt && ts - lastCommandAt < fallbackDelayMs) {
        pendingShortcutAt = 0;
        return false;
      }

      pendingShortcutAt = 0;
      lastFallbackAt = ts;
      return true;
    }

    return {
      noteShortcutPressed,
      noteShortcutCommand,
      shouldRunFallback
    };
  }

  return {
    isFormatShortcut,
    createShortcutArbiter
  };
});
