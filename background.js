// Background service worker for Chrome Extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('SonarQube Coverage Analyzer installed');
});

// Handle messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateProgress') {
    // Forward progress updates to popup if needed
    chrome.runtime.sendMessage(message);
  }
});