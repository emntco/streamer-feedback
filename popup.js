const BACKEND_URL = 'https://sf.emnt.co/';

document.addEventListener('DOMContentLoaded', function () {
    const loginButton = document.getElementById('login-button');
    const loginContainer = document.getElementById('login-container');
    const feedbackContainer = document.getElementById('feedback-container');
    const feedbackForm = document.getElementById('feedback-form');

    loginButton.addEventListener('click', function () {
        console.log('Login button clicked');
        initiateAuth();
    });

    feedbackForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const feedbackText = document.getElementById('feedback-text').value;
        chrome.storage.local.get('accessToken', function (data) {
            if (data.accessToken) {
                sendFeedback(data.accessToken, feedbackText);
            } else {
                console.error('No access token found');
            }
        });
    });

    chrome.storage.local.get('accessToken', function (data) {
        if (data.accessToken) {
            loginContainer.style.display = 'none';
            feedbackContainer.style.display = 'block';
            getUserInfo(data.accessToken);
        }
    });
});

function initiateAuth() {
    fetch(`${BACKEND_URL}?action=getAuthUrl`)
        .then(response => response.json())
        .then(data => {
            if (data.authUrl) {
                chrome.identity.launchWebAuthFlow({
                    url: data.authUrl,
                    interactive: true
                }, function (redirectUrl) {
                    if (chrome.runtime.lastError) {
                        console.error('Twitch auth error:', chrome.runtime.lastError);
                        return;
                    }
                    if (redirectUrl) {
                        const url = new URL(redirectUrl);
                        const code = url.searchParams.get('code');
                        if (code) {
                            exchangeCodeForToken(code);
                        } else {
                            console.error('No code found in redirect URL');
                        }
                    } else {
                        console.error('No redirect URL received');
                    }
                });
            } else {
                console.error('Failed to get auth URL from backend');
            }
        })
        .catch(error => console.error('Error initiating auth:', error));
}

function exchangeCodeForToken(code) {
    fetch(`${BACKEND_URL}?action=handleCallback&code=${encodeURIComponent(code)}`)
        .then(response => response.json())
        .then(data => {
            if (data.access_token) {
                chrome.storage.local.set({ accessToken: data.access_token }, function () {
                    console.log('Access token saved');
                    document.getElementById('login-container').style.display = 'none';
                    document.getElementById('feedback-container').style.display = 'block';
                    getUserInfo(data.access_token);
                });
            } else {
                console.error('Failed to get access token from backend');
            }
        })
        .catch(error => console.error('Error exchanging code for token:', error));
}

function getUserInfo(accessToken) {
    fetch(`${BACKEND_URL}?action=getUserInfo`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    })
        .then(response => response.json())
        .then(data => {
            console.log('User info:', data);
            // Update UI with user info
        })
        .catch(error => console.error('Error fetching user info:', error));
}

function sendFeedback(accessToken, feedbackText) {
    fetch(`${BACKEND_URL}?action=submitFeedback`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ feedbackText: feedbackText })
    })
        .then(response => response.json())
        .then(data => console.log('Feedback sent:', data))
        .catch(error => console.error('Error sending feedback:', error));
}