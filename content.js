console.log("Content script loaded on:", window.location.href);
chrome.runtime.sendMessage({ action: "checkTwitchChannel", path: window.location.pathname });