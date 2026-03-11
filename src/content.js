'use strict';

const CHANNEL = 'latex-format-extension';
const BUTTON_ID = 'latex-format-extension-button';
const TOAST_HOST_ID = 'latex-format-extension-toast-host';
const IS_TOP_FRAME = window.top === window;
const BUTTON_STORAGE_KEY = 'latex-format-extension-button-position';
const BUTTON_SIZE = 54;
const BUTTON_MARGIN = 20;
const BUTTON_DRAG_THRESHOLD = 6;

let injectionPromise = null;
let observerAttached = false;
let viewportResizeAttached = false;
let floatingButtonState = null;
let floatingButtonStateRestored = false;
let restoreButtonStatePromise = null;
let suppressButtonClick = false;
let floatingButtonInteractionVersion = 0;

function injectPageScript(path) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(path);
    script.async = false;

    script.onload = () => {
      script.remove();
      resolve();
    };

    script.onerror = () => {
      script.remove();
      reject(new Error(`failed to inject ${path}`));
    };

    (document.head || document.documentElement).appendChild(script);
  });
}

function ensureInjected() {
  if (!injectionPromise) {
    injectionPromise = injectPageScript('src/editor-target.js')
      .then(() => injectPageScript('src/formatter.js'))
      .then(() => injectPageScript('src/injected.js'))
      .catch((error) => {
        injectionPromise = null;
        throw error;
      });
  }

  return injectionPromise;
}

async function triggerFormat(trigger) {
  try {
    await ensureInjected();
    window.postMessage(
      {
        source: CHANNEL,
        type: 'LF_RUN_FORMAT',
        trigger: trigger || 'button'
      },
      '*'
    );
  } catch (error) {
    showToast(`Format failed: ${error.message}`, 'error');
  }
}

function requestTabBroadcast(trigger) {
  if (!IS_TOP_FRAME || !chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') {
    triggerFormat(trigger);
    return;
  }

  chrome.runtime.sendMessage(
    {
      type: 'LF_BROADCAST_FORMAT',
      trigger: trigger || 'button'
    },
    () => {
      if (chrome.runtime.lastError) {
        // Fallback for pages where broadcast is unavailable.
        triggerFormat(trigger);
      }
    }
  );
}

function getToastHost() {
  let host = document.getElementById(TOAST_HOST_ID);
  if (host) {
    return host;
  }

  host = document.createElement('div');
  host.id = TOAST_HOST_ID;
  host.style.position = 'fixed';
  host.style.top = '16px';
  host.style.right = '16px';
  host.style.zIndex = '2147483647';
  host.style.display = 'flex';
  host.style.flexDirection = 'column';
  host.style.gap = '8px';
  host.style.pointerEvents = 'none';
  document.body.appendChild(host);
  return host;
}

function showToast(message, type) {
  if (!document.body) {
    return;
  }

  const host = getToastHost();
  const toast = document.createElement('div');
  const palette = {
    success: '#1f9d55',
    info: '#1e5bbd',
    error: '#b42318'
  };

  toast.textContent = message;
  toast.style.padding = '10px 12px';
  toast.style.borderRadius = '8px';
  toast.style.fontSize = '12px';
  toast.style.fontWeight = '600';
  toast.style.fontFamily = 'ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
  toast.style.color = '#ffffff';
  toast.style.background = palette[type] || palette.info;
  toast.style.boxShadow = '0 6px 24px rgba(0, 0, 0, 0.2)';
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0px)';
  toast.style.transition = 'opacity 150ms ease, transform 150ms ease';

  host.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-4px)';
  }, 2200);

  setTimeout(() => {
    toast.remove();
  }, 2500);
}

function getFloatingButtonApi() {
  if (
    window.LatexFloatingButtonPosition &&
    typeof window.LatexFloatingButtonPosition.getDefaultFloatingButtonState === 'function' &&
    typeof window.LatexFloatingButtonPosition.clampFloatingButtonPosition === 'function' &&
    typeof window.LatexFloatingButtonPosition.clampFloatingButtonState === 'function' &&
    typeof window.LatexFloatingButtonPosition.snapFloatingButtonState === 'function' &&
    typeof window.LatexFloatingButtonPosition.resolveStoredFloatingButtonState === 'function' &&
    typeof window.LatexFloatingButtonPosition.didPointerMoveBeyondThreshold === 'function' &&
    typeof window.LatexFloatingButtonPosition.shouldApplyResolvedFloatingButtonState === 'function' &&
    typeof window.LatexFloatingButtonPosition.shouldSuppressButtonClickAfterPointerEnd === 'function'
  ) {
    return window.LatexFloatingButtonPosition;
  }

  function getViewportWidth(viewport) {
    return Number.isFinite(viewport && viewport.width) ? viewport.width : 0;
  }

  function getViewportHeight(viewport) {
    return Number.isFinite(viewport && viewport.height) ? viewport.height : 0;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getBounds(viewport, buttonSize, margin) {
    return {
      left: margin,
      top: margin,
      right: Math.max(margin, getViewportWidth(viewport) - margin - buttonSize),
      bottom: Math.max(margin, getViewportHeight(viewport) - margin - buttonSize)
    };
  }

  function clampFloatingButtonPosition(position, viewport, buttonSize, margin) {
    const bounds = getBounds(viewport, buttonSize, margin);

    return {
      left: clamp(Number.isFinite(position && position.left) ? position.left : bounds.left, bounds.left, bounds.right),
      top: clamp(Number.isFinite(position && position.top) ? position.top : bounds.bottom, bounds.top, bounds.bottom)
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

  return {
    getDefaultFloatingButtonState(viewport, buttonSize, margin) {
      const bounds = getBounds(viewport, buttonSize, margin);

      return {
        side: 'left',
        left: bounds.left,
        top: bounds.bottom
      };
    },
    clampFloatingButtonPosition,
    clampFloatingButtonState,
    snapFloatingButtonState(position, viewport, buttonSize, margin) {
      const centerX = (Number.isFinite(position && position.left) ? position.left : 0) + buttonSize / 2;
      const side = centerX >= getViewportWidth(viewport) / 2 ? 'right' : 'left';

      return clampFloatingButtonState({ side, top: position && position.top }, viewport, buttonSize, margin);
    },
    resolveStoredFloatingButtonState(rawValue, viewport, buttonSize, margin) {
      if (!rawValue || (rawValue.side !== 'left' && rawValue.side !== 'right') || !Number.isFinite(rawValue.top)) {
        return this.getDefaultFloatingButtonState(viewport, buttonSize, margin);
      }

      return clampFloatingButtonState(rawValue, viewport, buttonSize, margin);
    },
    didPointerMoveBeyondThreshold(startPoint, currentPoint, threshold) {
      const startX = Number.isFinite(startPoint && startPoint.x) ? startPoint.x : 0;
      const startY = Number.isFinite(startPoint && startPoint.y) ? startPoint.y : 0;
      const currentX = Number.isFinite(currentPoint && currentPoint.x) ? currentPoint.x : 0;
      const currentY = Number.isFinite(currentPoint && currentPoint.y) ? currentPoint.y : 0;
      const limit = Number.isFinite(threshold) ? threshold : 0;

      return Math.hypot(currentX - startX, currentY - startY) > limit;
    },
    shouldApplyResolvedFloatingButtonState(restoreInteractionVersion, currentInteractionVersion) {
      return restoreInteractionVersion === currentInteractionVersion;
    },
    shouldSuppressButtonClickAfterPointerEnd(wasDragging, eventType) {
      return !!wasDragging && eventType !== 'pointercancel';
    }
  };
}

function getViewportMetrics() {
  return {
    width: window.innerWidth || document.documentElement.clientWidth || 0,
    height: window.innerHeight || document.documentElement.clientHeight || 0
  };
}

function applyFloatingButtonState(button, state) {
  const safeState = state || getFloatingButtonApi().getDefaultFloatingButtonState(getViewportMetrics(), BUTTON_SIZE, BUTTON_MARGIN);

  floatingButtonState = {
    side: safeState.side === 'right' ? 'right' : 'left',
    left: Number.isFinite(safeState.left) ? safeState.left : BUTTON_MARGIN,
    top: Number.isFinite(safeState.top) ? safeState.top : BUTTON_MARGIN
  };

  button.style.left = `${floatingButtonState.left}px`;
  button.style.top = `${floatingButtonState.top}px`;
  button.dataset.side = floatingButtonState.side;
}

function getStoredFloatingButtonState() {
  return new Promise((resolve) => {
    if (!chrome.storage || !chrome.storage.local || typeof chrome.storage.local.get !== 'function') {
      resolve(null);
      return;
    }

    chrome.storage.local.get([BUTTON_STORAGE_KEY], (items) => {
      void chrome.runtime.lastError;
      resolve(items && items[BUTTON_STORAGE_KEY] ? items[BUTTON_STORAGE_KEY] : null);
    });
  });
}

function persistFloatingButtonState(state) {
  if (!chrome.storage || !chrome.storage.local || typeof chrome.storage.local.set !== 'function' || !state) {
    return;
  }

  chrome.storage.local.set(
    {
      [BUTTON_STORAGE_KEY]: {
        side: state.side,
        top: state.top
      }
    },
    () => {
      void chrome.runtime.lastError;
    }
  );
}

function syncFloatingButtonPresentation(button, hovered, dragging, focused) {
  button.style.cursor = dragging ? 'grabbing' : 'grab';
  button.style.transition = dragging
    ? 'transform 120ms ease, box-shadow 120ms ease, opacity 120ms ease'
    : 'transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease, left 140ms ease-out, top 140ms ease-out';
  button.style.outline = focused ? '3px solid rgba(255, 255, 255, 0.92)' : '2px solid transparent';
  button.style.outlineOffset = '3px';

  if (dragging) {
    button.style.transform = 'scale(0.96)';
    button.style.opacity = '0.92';
    button.style.boxShadow = focused
      ? '0 0 0 6px rgba(19, 138, 89, 0.18), 0 18px 36px rgba(19, 138, 89, 0.24), 0 10px 20px rgba(0, 0, 0, 0.18)'
      : '0 18px 36px rgba(19, 138, 89, 0.24), 0 10px 20px rgba(0, 0, 0, 0.18)';
    return;
  }

  if (focused) {
    button.style.transform = hovered ? 'translateY(-2px)' : 'translateY(0)';
    button.style.opacity = '1';
    button.style.boxShadow = hovered
      ? '0 0 0 6px rgba(19, 138, 89, 0.18), 0 18px 34px rgba(19, 138, 89, 0.22), 0 10px 20px rgba(0, 0, 0, 0.16)'
      : '0 0 0 6px rgba(19, 138, 89, 0.18), 0 14px 30px rgba(19, 138, 89, 0.2), 0 8px 18px rgba(0, 0, 0, 0.14)';
    return;
  }

  if (hovered) {
    button.style.transform = 'translateY(-2px)';
    button.style.opacity = '1';
    button.style.boxShadow = '0 18px 34px rgba(19, 138, 89, 0.22), 0 10px 20px rgba(0, 0, 0, 0.16)';
    return;
  }

  button.style.transform = 'translateY(0)';
  button.style.opacity = '1';
  button.style.boxShadow = '0 14px 30px rgba(19, 138, 89, 0.2), 0 8px 18px rgba(0, 0, 0, 0.14)';
}

function restoreFloatingButtonState(button) {
  const api = getFloatingButtonApi();
  const defaultState = api.getDefaultFloatingButtonState(getViewportMetrics(), BUTTON_SIZE, BUTTON_MARGIN);
  applyFloatingButtonState(button, floatingButtonState || defaultState);

  if (floatingButtonStateRestored) {
    return;
  }

  if (!restoreButtonStatePromise) {
    const restoreInteractionVersion = floatingButtonInteractionVersion;
    restoreButtonStatePromise = getStoredFloatingButtonState().then((storedState) => {
      const resolvedState = api.resolveStoredFloatingButtonState(
        storedState,
        getViewportMetrics(),
        BUTTON_SIZE,
        BUTTON_MARGIN
      );

      if (api.shouldApplyResolvedFloatingButtonState(restoreInteractionVersion, floatingButtonInteractionVersion)) {
        floatingButtonState = resolvedState;
      }

      floatingButtonStateRestored = true;
      return floatingButtonState || resolvedState;
    });
  }

  restoreButtonStatePromise.then((resolvedState) => {
    if (document.getElementById(BUTTON_ID) !== button) {
      return;
    }

    applyFloatingButtonState(button, resolvedState);
  });
}

function ensureButton() {
  if (!document.body || document.getElementById(BUTTON_ID)) {
    return;
  }

  const api = getFloatingButtonApi();
  const initialState = floatingButtonState || api.getDefaultFloatingButtonState(getViewportMetrics(), BUTTON_SIZE, BUTTON_MARGIN);
  const button = document.createElement('button');
  button.id = BUTTON_ID;
  button.type = 'button';
  button.title = 'Format LaTeX';
  button.setAttribute('aria-label', 'Format LaTeX');
  button.innerHTML = [
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">',
    '<path fill="currentColor" d="M6.75 5.25a.75.75 0 0 1 1.06 0l10.94 10.94a.75.75 0 1 1-1.06 1.06L6.75 6.31a.75.75 0 0 1 0-1.06Z"/>',
    '<path fill="currentColor" d="M14.53 4.47a2.25 2.25 0 0 1 3.18 3.18l-7.8 7.8a3.75 3.75 0 0 1-1.59.96l-2.73.78a.75.75 0 0 1-.93-.93l.78-2.73a3.75 3.75 0 0 1 .96-1.59Z"/>',
    '<path fill="currentColor" d="M17.5 2.75a.75.75 0 0 1 .75.75v1h1a.75.75 0 0 1 0 1.5h-1v1a.75.75 0 0 1-1.5 0v-1h-1a.75.75 0 0 1 0-1.5h1v-1a.75.75 0 0 1 .75-.75Z"/>',
    '</svg>'
  ].join('');

  button.style.position = 'fixed';
  button.style.left = `${initialState.left}px`;
  button.style.top = `${initialState.top}px`;
  button.style.zIndex = '2147483647';
  button.style.width = `${BUTTON_SIZE}px`;
  button.style.height = `${BUTTON_SIZE}px`;
  button.style.padding = '0';
  button.style.border = '1px solid rgba(255, 255, 255, 0.35)';
  button.style.borderRadius = '999px';
  button.style.background = 'linear-gradient(180deg, #22b573 0%, #138a59 100%)';
  button.style.color = '#ffffff';
  button.style.display = 'flex';
  button.style.alignItems = 'center';
  button.style.justifyContent = 'center';
  button.style.cursor = 'grab';
  button.style.userSelect = 'none';
  button.style.webkitUserSelect = 'none';
  button.style.touchAction = 'none';
  button.style.backdropFilter = 'blur(12px)';
  button.style.webkitBackdropFilter = 'blur(12px)';
  button.style.webkitTapHighlightColor = 'transparent';

  let hovered = false;
  let focused = false;
  let dragSession = null;

  function stopDragging(event) {
    if (!dragSession || event.pointerId !== dragSession.pointerId) {
      return;
    }

    const wasDragging = dragSession.dragging;
    suppressButtonClick = api.shouldSuppressButtonClickAfterPointerEnd(wasDragging, event.type);
    if (typeof button.releasePointerCapture === 'function') {
      try {
        button.releasePointerCapture(event.pointerId);
      } catch (_error) {
        // Ignore release failures from synthetic pointer lifecycles.
      }
    }

    dragSession = null;

    if (wasDragging) {
      const snappedState = api.snapFloatingButtonState(
        floatingButtonState,
        getViewportMetrics(),
        BUTTON_SIZE,
        BUTTON_MARGIN
      );
      applyFloatingButtonState(button, snappedState);
      persistFloatingButtonState(snappedState);
    }

    syncFloatingButtonPresentation(button, hovered, false, focused);
  }

  button.addEventListener('mouseenter', () => {
    hovered = true;
    syncFloatingButtonPresentation(button, hovered, !!(dragSession && dragSession.dragging), focused);
  });

  button.addEventListener('mouseleave', () => {
    hovered = false;
    syncFloatingButtonPresentation(button, hovered, !!(dragSession && dragSession.dragging), focused);
  });

  button.addEventListener('focus', () => {
    focused = true;
    syncFloatingButtonPresentation(button, hovered, !!(dragSession && dragSession.dragging), focused);
  });

  button.addEventListener('blur', () => {
    focused = false;
    syncFloatingButtonPresentation(button, hovered, !!(dragSession && dragSession.dragging), focused);
  });

  button.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) {
      return;
    }

    const currentState = floatingButtonState || api.getDefaultFloatingButtonState(getViewportMetrics(), BUTTON_SIZE, BUTTON_MARGIN);

    dragSession = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originLeft: currentState.left,
      originTop: currentState.top,
      dragging: false
    };

    suppressButtonClick = false;

    if (typeof button.setPointerCapture === 'function') {
      try {
        button.setPointerCapture(event.pointerId);
      } catch (_error) {
        // Ignore capture failures in unsupported browsers.
      }
    }
  });

  button.addEventListener('pointermove', (event) => {
    if (!dragSession || event.pointerId !== dragSession.pointerId) {
      return;
    }

    const isDragging = dragSession.dragging || api.didPointerMoveBeyondThreshold(
      { x: dragSession.startX, y: dragSession.startY },
      { x: event.clientX, y: event.clientY },
      BUTTON_DRAG_THRESHOLD
    );

    if (!isDragging) {
      return;
    }

    if (!dragSession.dragging) {
      dragSession.dragging = true;
      floatingButtonInteractionVersion += 1;
      suppressButtonClick = true;
    }

    const nextPosition = api.clampFloatingButtonPosition(
      {
        left: dragSession.originLeft + (event.clientX - dragSession.startX),
        top: dragSession.originTop + (event.clientY - dragSession.startY)
      },
      getViewportMetrics(),
      BUTTON_SIZE,
      BUTTON_MARGIN
    );

    applyFloatingButtonState(button, {
      side: floatingButtonState && floatingButtonState.side === 'right' ? 'right' : 'left',
      left: nextPosition.left,
      top: nextPosition.top
    });

    syncFloatingButtonPresentation(button, hovered, true, focused);
    event.preventDefault();
  });

  button.addEventListener('pointerup', stopDragging);
  button.addEventListener('pointercancel', stopDragging);
  button.addEventListener('dragstart', (event) => {
    event.preventDefault();
  });

  button.addEventListener('click', (event) => {
    if (suppressButtonClick) {
      suppressButtonClick = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    requestTabBroadcast('button');
  });

  document.body.appendChild(button);
  syncFloatingButtonPresentation(button, false, false, false);
  restoreFloatingButtonState(button);
}

function attachObserver() {
  if (observerAttached) {
    return;
  }

  observerAttached = true;
  const observer = new MutationObserver(() => {
    if (!document.getElementById(BUTTON_ID)) {
      ensureButton();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

function attachViewportResize() {
  if (viewportResizeAttached) {
    return;
  }

  viewportResizeAttached = true;
  window.addEventListener('resize', () => {
    const button = document.getElementById(BUTTON_ID);
    if (!button || !floatingButtonState) {
      return;
    }

    const nextState = getFloatingButtonApi().clampFloatingButtonState(
      floatingButtonState,
      getViewportMetrics(),
      BUTTON_SIZE,
      BUTTON_MARGIN
    );

    applyFloatingButtonState(button, nextState);

    if (floatingButtonStateRestored) {
      persistFloatingButtonState(nextState);
    }
  });
}

function handleInjectedResult(event) {
  if (event.source !== window || !event.data || event.data.source !== CHANNEL) {
    return;
  }

  if (event.data.type !== 'LF_FORMAT_RESULT') {
    return;
  }

  if (!event.data.ok) {
    showToast(`Format failed: ${event.data.error || 'unknown error'}`, 'error');
    return;
  }

  if (event.data.changed) {
    showToast('LaTeX formatted successfully', 'success');
    return;
  }

  const details = [];
  if (event.data.editorType) {
    details.push(`editor=${event.data.editorType}`);
  }
  if (event.data.candidateCount) {
    details.push(`candidates=${event.data.candidateCount}`);
  }

  if (details.length > 0) {
    if (event.data.editorType === 'textarea' && event.data.likelyLatex === false) {
      showToast('Format failed: Could not detect LaTeX editor. Click inside editor and retry.', 'error');
      return;
    }

    showToast(`No formatting changes needed (${details.join(', ')})`, 'info');
    return;
  }

  showToast('No formatting changes needed', 'info');
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== 'LF_TRIGGER_FORMAT') {
    return;
  }

  triggerFormat(message.trigger || 'toolbar');
  sendResponse({ ok: true });
});

window.addEventListener('message', handleInjectedResult);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (IS_TOP_FRAME) {
      ensureButton();
      attachObserver();
      attachViewportResize();
    }
  });
} else {
  if (IS_TOP_FRAME) {
    ensureButton();
    attachObserver();
    attachViewportResize();
  }
}
