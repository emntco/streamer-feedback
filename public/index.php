<?php

require '../config/config.php';
require '../src/OAuthHandler.php';

// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Add CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Function to log messages
function logMessage($message) {
    file_put_contents('debug.log', date('[Y-m-d H:i:s] ') . $message . PHP_EOL, FILE_APPEND);
}

logMessage("Script started");

// Load the database connection
$pdo = require '../config/config.php';

$oauth = new OAuthHandler();

// Check if there's an action parameter
if (isset($_GET['action'])) {
    logMessage("Action received: " . $_GET['action']);
    header('Content-Type: application/json');
    
    switch ($_GET['action']) {
        case 'getAuthUrl':
            $authUrl = $oauth->getAuthUrl();
            if ($authUrl) {
                logMessage("Auth URL generated: " . $authUrl);
                echo json_encode(['authUrl' => $authUrl]);
            } else {
                logMessage("Failed to generate Auth URL");
                echo json_encode(['error' => 'Failed to generate Auth URL']);
            }
            exit;
        case 'handleCallback':
            if (isset($_GET['code'])) {
                logMessage("Handling callback with code: " . $_GET['code']);
                $token = $oauth->handleCallback($_GET['code']);
                if ($token) {
                    logMessage("Token received: " . $token);
                    echo json_encode(['access_token' => $token]);
                } else {
                    logMessage("Failed to obtain token");
                    echo json_encode(['error' => 'Failed to obtain token']);
                }
            } else {
                logMessage("No code provided in callback");
                echo json_encode(['error' => 'No code provided']);
            }
            exit;
        case 'checkTwitchChannel':
            if (!isset($_GET['username'])) {
                logMessage("Username not provided for channel check");
                echo json_encode(['error' => 'Username not provided']);
                exit;
            }
            
            $username = $_GET['username'];
            $accessToken = getBearerToken();
            
            if (!$accessToken) {
                logMessage("No access token provided for channel check");
                echo json_encode(['error' => 'No access token provided']);
                exit;
            }
            
            $isChannel = $oauth->checkTwitchChannel($username, $accessToken);
            logMessage("Channel check result for $username: " . ($isChannel ? 'valid' : 'invalid'));
            echo json_encode(['isChannel' => $isChannel]);
            exit;
        case 'validateToken':
            $accessToken = getBearerToken();
            if (!$accessToken) {
                logMessage("No access token provided for validation");
                echo json_encode(['error' => 'No access token provided']);
                exit;
            }
            $isValid = $oauth->validateToken($accessToken);
            logMessage("Token validation result: " . ($isValid ? 'valid' : 'invalid'));
            echo json_encode(['valid' => $isValid]);
            exit;
        case 'submitFeedback':
            logMessage("Submitting feedback");
            $input = json_decode(file_get_contents('php://input'), true);
            $accessToken = getBearerToken();
            
            if (!$accessToken) {
                logMessage("No access token provided for feedback submission");
                echo json_encode(['error' => 'No access token provided']);
                exit;
            }
            
            $userInfo = $oauth->getUserInfo($accessToken);
            
            if (!$userInfo) {
                logMessage("Failed to get user info for feedback submission");
                echo json_encode(['error' => 'Failed to get user info']);
                exit;
            }
            
            $query = $pdo->prepare("INSERT INTO sf_feedback (twitch_user_id, feedback_text) VALUES (:user_id, :feedback)");
            $result = $query->execute([
                ':user_id' => $userInfo['id'],
                ':feedback' => $input['feedbackText'] ?? 'No feedback provided'
            ]);
            
            if ($result) {
                logMessage("Feedback submitted successfully");
                echo json_encode(['success' => true]);
            } else {
                logMessage("Failed to submit feedback");
                echo json_encode(['error' => 'Failed to submit feedback']);
            }
            exit;
        default:
            logMessage("Unknown action: " . $_GET['action']);
            echo json_encode(['error' => 'Unknown action']);
            exit;
    }
}

logMessage("No action specified");
echo "Welcome to the Twitch Feedback API. Please use the Chrome extension to interact with this service.";

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
