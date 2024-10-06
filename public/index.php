<?php

require '../config/config.php';
require '../src/OAuthHandler.php';

// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Function to log messages
function logMessage($message) {
	file_put_contents('debug.log', date('[Y-m-d H:i:s] ') . $message . PHP_EOL, FILE_APPEND);
}

logMessage("Script started");

// Load the database connection
$pdo = require '../config/config.php';

$oauth = new OAuthHandler();

<<<<<<< Updated upstream
// Check if it's an API request
if (isset($_GET['action'])) {
    header('Content-Type: application/json');
    
    switch ($_GET['action']) {
        case 'checkTwitchChannel':
            if (!isset($_GET['username'])) {
                echo json_encode(['error' => 'Username not provided']);
                exit;
            }
            
            $username = $_GET['username'];
            $accessToken = getBearerToken();
            
            if (!$accessToken) {
                echo json_encode(['error' => 'No access token provided']);
                exit;
            }
            
            $isChannel = $oauth->checkTwitchChannel($username, $accessToken);
            echo json_encode(['isChannel' => $isChannel]);
            exit;
        
        default:
            echo json_encode(['error' => 'Unknown action']);
            exit;
    }
}

// If there's no OAuth code, redirect to Twitch login
if (!isset($_GET['code'])) {
    // Redirect the user to Twitch for authorization
    header('Location: ' . $oauth->getAuthUrl());
    exit;
} else {
    // Handle the callback and exchange the code for an access token
    $token = $oauth->handleCallback($_GET['code']);
    
    // (Optional) Retrieve user info using the token
    $userInfo = $oauth->getUserInfo($token);
    
    // Output token or user info for testing (for development purposes only)
    echo "Access token: " . $token;
    echo "<br>User info: " . print_r($userInfo, true);
    
    // Insert user feedback into the database
    $query = $pdo->prepare("INSERT INTO sf_feedback (twitch_user_id, feedback_text) VALUES (:user_id, :feedback)");
    $query->execute([
        ':user_id' => $userInfo['id'],
        ':feedback' => 'Sample feedback text'  // Replace this with actual feedback input
    ]);

    echo "<br>User feedback stored successfully!";
}

// Function to get the bearer token from the Authorization header
function getBearerToken() {
    $headers = apache_request_headers();
    if (isset($headers['Authorization'])) {
        if (preg_match('/Bearer\s(\S+)/', $headers['Authorization'], $matches)) {
            return $matches[1];
        }
    }
    return null;
}
=======
// Check if there's an action parameter
if (isset($_GET['action'])) {
	logMessage("Action received: " . $_GET['action']);
	switch ($_GET['action']) {
	case 'getAuthUrl':
		$authUrl = $oauth->getAuthUrl();
		logMessage("Auth URL generated: " . $authUrl);
		echo json_encode(['authUrl' => $authUrl]);
		exit;
	case 'handleCallback':
		if (isset($_GET['code'])) {
			logMessage("Handling callback with code: " . $_GET['code']);
			$token = $oauth->handleCallback($_GET['code']);
			logMessage("Token received: " . $token);
			echo json_encode(['access_token' => $token]);
		} else {
			logMessage("No code provided in callback");
			echo json_encode(['error' => 'No code provided']);
		}
		exit;
	case 'validateToken':
		$input = json_decode(file_get_contents('php://input'), true);
		$accessToken = $input['accessToken'] ?? '';
		logMessage("Validating token: " . substr($accessToken, 0, 10) . '...');
		$isValid = $oauth->validateToken($accessToken);
		logMessage("Token validation result: " . ($isValid ? 'valid' : 'invalid'));
		echo json_encode(['valid' => $isValid]);
		exit;
	case 'submitFeedback':
		logMessage("Submitting feedback");
		// Handle feedback submission (implement this part)
		exit;
	default:
		logMessage("Unknown action: " . $_GET['action']);
		echo json_encode(['error' => 'Unknown action']);
		exit;
	}
}

logMessage("No action specified");
// If no action is specified, show a default page or handle as needed
echo "Welcome to the Twitch Feedback API. Please use the Chrome extension to interact with this service.";
>>>>>>> Stashed changes
