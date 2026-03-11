'use strict';

chrome.action.onClicked.addListener((tab) => {
  if (!tab || typeof tab.id !== 'number') {
    return;
  }

  chrome.tabs.sendMessage(
    tab.id,
    {
      type: 'LF_TRIGGER_FORMAT',
      trigger: 'toolbar'
    },
    () => {
      // Ignore errors when user clicks outside Overleaf pages.
      void chrome.runtime.lastError;
    }
  );
});

function triggerFormatForTab(tabId, trigger) {
  if (typeof tabId !== 'number') {
    return;
  }

  chrome.tabs.sendMessage(
    tabId,
    {
      type: 'LF_TRIGGER_FORMAT',
      trigger
    },
    () => {
      void chrome.runtime.lastError;
    }
  );
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== 'LF_BROADCAST_FORMAT') {
    return;
  }

  const tabId = sender && sender.tab && typeof sender.tab.id === 'number' ? sender.tab.id : null;
  if (tabId === null) {
    sendResponse({ ok: false });
    return;
  }

  chrome.tabs.sendMessage(
    tabId,
    {
      type: 'LF_TRIGGER_FORMAT',
      trigger: message.trigger || 'button'
    },
    () => {
      void chrome.runtime.lastError;
    }
  );

  sendResponse({ ok: true });
});
