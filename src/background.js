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

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'format_latex') {
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!Array.isArray(tabs) || tabs.length === 0 || typeof tabs[0].id !== 'number') {
      return;
    }

    triggerFormatForTab(tabs[0].id, 'shortcut');
  });
});

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
