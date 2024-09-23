const BACKEND_URL = 'https://sf.emnt.co';

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const loginContainer = document.getElementById('login-container');
    const feedbackContainer = document.getElementById('feedback-container');
    const feedbackForm = document.getElementById('feedback-form');

    checkAuthStatus();

    loginButton.addEventListener('click', function() {
        console.log('Login button clicked');
        initiateAuth();
    });

    logoutButton.addEventListener('click', function() {
        console.log('Logout button clicked');
        logout();
    });

    feedbackForm.addEventListener('submit', function(event) {
        event.preventDefault();
        submitFeedback();
    });
});

function checkAuthStatus() {
    console.log('Checking auth status');
    chrome.storage.local.get('accessToken', function(data) {
        console.log('Chrome storage data:', data);
        if (data.accessToken) {
            console.log('Access token found in storage');
            validateTwitchToken(data.accessToken);
        } else {
            console.log('No access token found in storage');
            showLoginButton();
        }
    });
}

function initiateAuth() {
    console.log('Initiating auth');
    fetch(`${BACKEND_URL}?action=getAuthUrl`)
        .then(response => response.json())
        .then(data => {
            console.log('Auth URL received:', data);
            if (data.authUrl) {
                chrome.identity.launchWebAuthFlow({
                    url: data.authUrl,
                    interactive: true
                }, function(redirectUrl) {
                    if (chrome.runtime.lastError) {
                        console.error('Twitch auth error:', chrome.runtime.lastError);
                        return;
                    }
                    console.log('Redirect URL:', redirectUrl);
                    if (redirectUrl) {
                        handleAuthRedirect(redirectUrl);
                    } else {
                        console.error('No redirect URL received');
                        showLoginButton();
                    }
                });
            } else {
                console.error('Failed to get auth URL from backend');
                showLoginButton();
            }
        })
        .catch(error => {
            console.error('Error initiating auth:', error);
            showLoginButton();
        });
}

function handleAuthRedirect(redirectUrl) {
    console.log('Handling auth redirect');
    const url = new URL(redirectUrl);
    const code = url.searchParams.get('code');
    if (code) {
        console.log('Auth code received:', code);
        exchangeCodeForToken(code);
    } else {
        console.error('No code found in redirect URL');
        showLoginButton();
    }
}

function exchangeCodeForToken(code) {
    console.log('Exchanging code for token');
    fetch(`${BACKEND_URL}?action=handleCallback&code=${encodeURIComponent(code)}`)
        .then(response => response.json())
        .then(data => {
            console.log('Token exchange response:', data);
            if (data.access_token) {
                saveAccessToken(data.access_token);
            } else {
                console.error('Failed to get access token from backend');
                showLoginButton();
            }
        })
        .catch(error => {
            console.error('Error exchanging code for token:', error);
            showLoginButton();
        });
}

function saveAccessToken(token) {
    console.log('Saving access token');
    chrome.storage.local.set({accessToken: token}, function() {
        if (chrome.runtime.lastError) {
            console.error('Error saving access token:', chrome.runtime.lastError);
            showLoginButton();
        } else {
            console.log('Access token saved successfully');
            validateTwitchToken(token);
        }
    });
}

function validateTwitchToken(token) {
    console.log('Validating Twitch token');
    fetch(`${BACKEND_URL}?action=validateToken`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken: token })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Token validation response:', data);
        if (data.valid) {
            console.log('Token is valid');
            showFeedbackForm();
        } else {
            console.log('Token is invalid');
            logout();
        }
    })
    .catch(error => {
        console.error('Error validating token:', error);
        logout();
    });
}

function showLoginButton() {
    console.log('Showing login button');
    document.getElementById('login-container').style.display = 'block';
    document.getElementById('feedback-container').style.display = 'none';
}

function showFeedbackForm() {
    console.log('Showing feedback form');
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('feedback-container').style.display = 'block';
}

function submitFeedback() {
    console.log('Submitting feedback');
    const feedbackText = document.getElementById('feedback-text').value;
    chrome.storage.local.get('accessToken', function(data) {
        if (data.accessToken) {
            fetch(`${BACKEND_URL}?action=submitFeedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${data.accessToken}`
                },
                body: JSON.stringify({ 
                    feedbackText: feedbackText
                })
            })
            .then(response => response.json())
            .then(data => {
                console.log('Feedback submitted:', data);
                document.getElementById('feedback-text').value = '';
                alert('Feedback submitted successfully!');
            })
            .catch(error => {
                console.error('Error submitting feedback:', error);
                alert('Error submitting feedback. Please try again.');
            });
        } else {
            console.error('No access token found');
            showLoginButton();
        }
    });
}

function logout() {
    console.log('Logging out');
    chrome.storage.local.remove('accessToken', function() {
        console.log('Access token removed');
        showLoginButton();
    });
}