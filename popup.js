document.addEventListener('DOMContentLoaded', function () {
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const loginContainer = document.getElementById('login-container');
    const feedbackContainer = document.getElementById('feedback-container');
    const feedbackForm = document.getElementById('feedback-form');

    checkAuthStatus();

    loginButton.addEventListener('click', function () {
        chrome.runtime.sendMessage({ action: "initiateAuth" });
    });

    logoutButton.addEventListener('click', function () {
        logout();
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

function checkAuthStatus() {
    chrome.runtime.sendMessage({ action: "checkAuthStatus" }, (response) => {
        if (response.isAuthenticated) {
            showFeedbackForm();
        } else {
            showLoginButton();
        }
    });
}

function showLoginButton() {
    document.getElementById('login-container').style.display = 'block';
    document.getElementById('feedback-container').style.display = 'none';
}

function showFeedbackForm() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('feedback-container').style.display = 'block';
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
    chrome.storage.local.remove('accessToken', function () {
        console.log('Access token removed');
        showLoginButton();
    });
}