'use strict';

const CHANNEL = 'latex-format-extension';
const BUTTON_ID = 'latex-format-extension-button';
const TOAST_HOST_ID = 'latex-format-extension-toast-host';
const IS_TOP_FRAME = window.top === window;
const SHORTCUT_KEY = 'u';
const SHORTCUT_FALLBACK_DELAY_MS = 240;

let injectionPromise = null;
let observerAttached = false;
let shortcutFallbackTimer = null;

const shortcutArbiter = window.LatexShortcut && typeof window.LatexShortcut.createShortcutArbiter === 'function'
  ? window.LatexShortcut.createShortcutArbiter({
      fallbackDelayMs: SHORTCUT_FALLBACK_DELAY_MS,
      suppressCommandAfterFallbackMs: 500
    })
  : null;

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

function ensureButton() {
  if (!document.body || document.getElementById(BUTTON_ID)) {
    return;
  }

  const button = document.createElement('button');
  button.id = BUTTON_ID;
  button.type = 'button';
  button.textContent = 'Format';
  button.title = 'Format current LaTeX file';

  button.style.position = 'fixed';
  button.style.bottom = '20px';
  button.style.right = '20px';
  button.style.zIndex = '2147483647';
  button.style.padding = '10px 14px';
  button.style.border = '0';
  button.style.borderRadius = '8px';
  button.style.background = '#138a59';
  button.style.color = '#ffffff';
  button.style.cursor = 'pointer';
  button.style.fontSize = '13px';
  button.style.fontWeight = '700';
  button.style.fontFamily = 'ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
  button.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.2)';

  button.addEventListener('mouseenter', () => {
    button.style.background = '#0f724a';
  });

  button.addEventListener('mouseleave', () => {
    button.style.background = '#138a59';
  });

  button.addEventListener('click', () => {
    requestTabBroadcast('button');
  });

  document.body.appendChild(button);
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

function isFormatShortcutEvent(event) {
  if (window.LatexShortcut && typeof window.LatexShortcut.isFormatShortcut === 'function') {
    return window.LatexShortcut.isFormatShortcut(event);
  }

  if (!event || event.isComposing) {
    return false;
  }

  if (typeof event.key !== 'string' || event.key.toLowerCase() !== SHORTCUT_KEY) {
    return false;
  }

  const isMacCommandShortcut = !!event.metaKey && !!event.shiftKey && !event.altKey && !event.ctrlKey;
  const isFallbackShortcut = !!event.altKey && !!event.shiftKey && !event.metaKey && !event.ctrlKey;

  return isMacCommandShortcut || isFallbackShortcut;
}

function handleKeydown(event) {
  if (!isFormatShortcutEvent(event)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  if (shortcutArbiter && typeof shortcutArbiter.noteShortcutPressed === 'function') {
    shortcutArbiter.noteShortcutPressed();
  }

  if (shortcutFallbackTimer) {
    clearTimeout(shortcutFallbackTimer);
  }

  shortcutFallbackTimer = setTimeout(() => {
    shortcutFallbackTimer = null;

    const shouldRunFallback = shortcutArbiter && typeof shortcutArbiter.shouldRunFallback === 'function'
      ? shortcutArbiter.shouldRunFallback()
      : true;

    if (!shouldRunFallback) {
      return;
    }

    triggerFormat('shortcut-fallback');
  }, SHORTCUT_FALLBACK_DELAY_MS);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== 'LF_TRIGGER_FORMAT') {
    return;
  }

  const trigger = message.trigger || 'toolbar';

  if (trigger === 'shortcut') {
    if (shortcutFallbackTimer) {
      clearTimeout(shortcutFallbackTimer);
      shortcutFallbackTimer = null;
    }

    if (shortcutArbiter && typeof shortcutArbiter.noteShortcutCommand === 'function') {
      const shouldApplyCommand = shortcutArbiter.noteShortcutCommand();
      if (!shouldApplyCommand) {
        sendResponse({ ok: true, skipped: 'duplicate-shortcut' });
        return;
      }
    }
  }

  triggerFormat(trigger);
  sendResponse({ ok: true });
});

window.addEventListener('message', handleInjectedResult);
window.addEventListener('keydown', handleKeydown, true);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (IS_TOP_FRAME) {
      ensureButton();
      attachObserver();
    }
  });
} else {
  if (IS_TOP_FRAME) {
    ensureButton();
    attachObserver();
  }
}
