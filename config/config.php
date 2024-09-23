<?php

/**
 * Configuration file for the backend.
 * This file loads environment variables and sets up database connection.
 */

// Load environment variables from the pool.d file if not already loaded.
if (!getenv('TWITCH_CLIENT_ID')) {
    throw new Exception('Twitch Client ID not found. Make sure your environment is configured properly.');
}

// Database connection configuration
$dsn = 'mysql:host=' . getenv('DB_HOST') . ';dbname=' . getenv('DB_NAME');
try {
    $pdo = new PDO($dsn, getenv('DB_USER'), getenv('DB_PASS'));
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo 'Connection failed: ' . $e->getMessage();
    exit;
}

// Return the database connection for use across the application
return $pdo;
