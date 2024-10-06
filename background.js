const BACKEND_URL = 'https://sf.emnt.co';
let authInProgress = false;
let authTabId = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "initiateAuth") {
        initiateAuth();
    } else if (request.action === "checkAuthStatus") {
        checkAuthStatus(sendResponse);
        return true; // Indicates that the response is sent asynchronously
    } else if (request.action === "checkTwitchChannel") {
        checkIfTwitchChannel(request.path, sendResponse);
        return true; // Keep the message channel open for async response
    } else if (request.action === "checkTwitchChannel") {
        checkIfTwitchChannel(request.path, sendResponse);
        return true; // Keep the message channel open for async response
    }
});

function initiateAuth() {
    if (authInProgress) return;
    authInProgress = true;

    fetch(`${BACKEND_URL}?action=getAuthUrl`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.authUrl) {
                chrome.tabs.create({ url: data.authUrl }, (tab) => {
                    authTabId = tab.id;
                    startAuthStatusCheck();
                });
            } else {
                console.error('Failed to get auth URL from backend:', data);
                authInProgress = false;
            }
        })
        .catch(error => {
            console.error('Error initiating auth:', error.message);
            authInProgress = false;
        });
}

function startAuthStatusCheck() {
    let checkCount = 0;
    const maxChecks = 15; // 15 seconds of checking
    const interval = setInterval(() => {
        if (checkCount >= maxChecks) {
            clearInterval(interval);
            authInProgress = false;
            return;
        }
        checkCount++;

        chrome.tabs.get(authTabId, (tab) => {
            if (chrome.runtime.lastError || !tab) {
                // Auth tab was closed
                clearInterval(interval);
                handleAuthRedirect(tab.url);
            } else if (tab.url.includes('code=')) {
                // Auth was successful
                clearInterval(interval);
                chrome.tabs.remove(authTabId);
                handleAuthRedirect(tab.url);
            }
        });
    }, 1000); // Check every second
}

function handleAuthRedirect(url) {
    const code = new URL(url).searchParams.get('code');
    if (code) {
        exchangeCodeForToken(code);
    } else {
        console.error('No code found in redirect URL');
        authInProgress = false;
    }
}

function exchangeCodeForToken(code) {
    fetch(`${BACKEND_URL}?action=handleCallback&code=${encodeURIComponent(code)}`)
        .then(response => response.json())
        .then(data => {
            if (data.access_token) {
                saveAccessToken(data.access_token);
            } else {
                console.error('Failed to get access token from backend');
            }
        })
        .catch(error => {
            console.error('Error exchanging code for token:', error);
        })
        .finally(() => {
            authInProgress = false;
        });
}

function saveAccessToken(token) {
    chrome.storage.local.set({ accessToken: token }, () => {
        if (chrome.runtime.lastError) {
            console.error('Error saving access token:', chrome.runtime.lastError);
        } else {
            console.log('Access token saved successfully');
            chrome.runtime.sendMessage({ action: "authComplete" });
        }
    });
}

function checkAuthStatus(sendResponse) {
    chrome.storage.local.get('accessToken', (data) => {
        if (data.accessToken) {
            validateTwitchToken(data.accessToken, sendResponse);
        } else {
            sendResponse({ isAuthenticated: false });
        }
    });
}

function validateTwitchToken(token, sendResponse) {
    fetch(`${BACKEND_URL}?action=validateToken`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken: token })
    })
        .then(response => response.json())
        .then(data => {
            sendResponse({ isAuthenticated: data.valid });
        })
        .catch(error => {
            console.error('Error validating token:', error);
            sendResponse({ isAuthenticated: false });
        });
}

function checkIfTwitchChannel(path, sendResponse) {
    const username = path.split('/').filter(Boolean).pop()
    chrome.storage.local.get('accessToken', (data) => {
        if (data.accessToken) {
            fetch(`${BACKEND_URL}?action=checkTwitchChannel&username=${encodeURIComponent(username)}`, {
                headers: {
                    'Authorization': `Bearer ${data.accessToken}`
                }
            })
                .then(response => response.json())
                .then(data => {
                    sendResponse({ isChannel: data.isChannel });
                })
                .catch(error => {
                    console.error('Error checking Twitch channel:', error);
                    sendResponse({ isChannel: false });
                });
        } else {
            sendResponse({ isChannel: false });
        }
    });
    return true; // Keep the message channel open for async response
}