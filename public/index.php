<?php

require 'config/config.php';
require 'src/OAuthHandler.php';

// Load the database connection
$pdo = require 'config/config.php';

$oauth = new OAuthHandler();

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
