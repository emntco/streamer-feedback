document.addEventListener('DOMContentLoaded', function () {
    checkIfOnTwitchChannel();
    const authButton = document.getElementById('auth-button');
    const feedbackContainer = document.getElementById('feedback-container');
    const feedbackForm = document.getElementById('feedback-form');

    checkAuthStatus();

    let debounceTimer;
    authButton.addEventListener('click', function () {
        console.log('Auth button clicked'); // Add this line for debugging
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (authButton.textContent === 'Login with Twitch') {
                chrome.runtime.sendMessage({ action: "initiateAuth" });
            } else {
                logout();
            }
        }, 300); // 300ms debounce time
    });

    feedbackForm.addEventListener('submit', function (event) {
        event.preventDefault();
        submitFeedback();
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "authComplete") {
            checkAuthStatus();
        }
    });
});

function checkIfOnTwitchChannel() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url && tabs[0].url.includes('twitch.tv')) {
            chrome.runtime.sendMessage({ action: "checkTwitchChannel", path: new URL(tabs[0].url).pathname }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError);
                    disableFeedbackForm();
                    return;
                }
                if (response && response.isChannel) {
                    enableFeedbackForm();
                    // Display the channel name
                    const channelName = new URL(tabs[0].url).pathname.split('/').pop();
                    document.getElementById('feedback-for').textContent = `Leaving feedback for: @${channelName}`;
                } else {
                    disableFeedbackForm();
                }
            });
        } else {
            disableFeedbackForm();
        }
    });
}

function enableFeedbackForm() {
    const feedbackForm = document.getElementById('feedback-form');
    const notOnChannelMessage = document.getElementById('not-on-channel-message');
    if (feedbackForm) feedbackForm.style.display = 'block';
    if (notOnChannelMessage) notOnChannelMessage.style.display = 'none';
}

function disableFeedbackForm() {
    const feedbackForm = document.getElementById('feedback-form');
    const notOnChannelMessage = document.getElementById('not-on-channel-message');
    if (feedbackForm) feedbackForm.style.display = 'none';
    if (notOnChannelMessage) notOnChannelMessage.style.display = 'block';
}

function checkAuthStatus() {
    chrome.runtime.sendMessage({ action: "checkAuthStatus" }, (response) => {
        if (response.isAuthenticated) {
            showFeedbackForm();
            document.getElementById('auth-button').textContent = 'Logout';
        } else {
            showLoginButton();
            document.getElementById('auth-button').textContent = 'Login with Twitch';
        }
    });
}

function showLoginButton() {
    document.getElementById('feedback-container').style.display = 'none';
    document.getElementById('control-container').style.display = 'flex';
}

function showFeedbackForm() {
    document.getElementById('feedback-container').style.display = 'block';
    document.getElementById('control-container').style.display = 'flex';
}

function submitFeedback() {
    const feedbackText = document.getElementById('feedback-text').value;
    chrome.storage.local.get('accessToken', function (data) {
        if (data.accessToken) {
            fetch('https://sf.emnt.co?action=submitFeedback', {
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
    chrome.storage.local.remove('accessToken', function () {
        showLoginButton();
    });
}