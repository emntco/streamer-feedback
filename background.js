console.log('Background script loaded');

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Message received in background:', request);
    if (request.action === "refreshPopup") {
        chrome.runtime.reload();
        sendResponse({success: true});
    }
});