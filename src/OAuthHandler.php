<?php

require 'vendor/autoload.php'; // Only necessary if using Composer, which you aren't right now
use GuzzleHttp\Client;

class OAuthHandler {
    private $clientId;
    private $clientSecret;
    private $redirectUri;
    
    public function __construct() {
        // Load environment variables from PHP-FPM pool
        $this->clientId = getenv('TWITCH_CLIENT_ID');
        $this->clientSecret = getenv('TWITCH_CLIENT_SECRET');
        $this->redirectUri = getenv('TWITCH_REDIRECT_URI');
    }

    /**
     * Generates the Twitch authorization URL for users to log in.
     */
    public function getAuthUrl() {
        $state = bin2hex(random_bytes(16)); // Random state token for security
        $scopes = 'user:read:email'; // Define the necessary scopes
        $url = "https://id.twitch.tv/oauth2/authorize?response_type=code&client_id={$this->clientId}&redirect_uri={$this->redirectUri}&scope={$scopes}&state={$state}";
        return $url;
    }

    /**
     * Handles the Twitch OAuth callback and exchanges the code for an access token.
     * 
     * @param string $code The authorization code returned by Twitch after user login.
     * @return string Access token returned from Twitch.
     */
    public function handleCallback($code) {
        $client = new Client();

        // Prepare the request to exchange the code for an access token
        $response = $client->post('https://id.twitch.tv/oauth2/token', [
            'form_params' => [
                'client_id' => $this->clientId,
                'client_secret' => $this->clientSecret,
                'code' => $code,
                'grant_type' => 'authorization_code',
                'redirect_uri' => $this->redirectUri,
            ]
        ]);

        // Decode the JSON response to get the access token
        $body = json_decode($response->getBody(), true);
        return $body['access_token'];
    }

    /**
     * (Optional) Retrieves the user's Twitch profile information using the access token.
     * 
     * @param string $accessToken The access token received after OAuth authentication.
     * @return array User profile information.
     */
    public function getUserInfo($accessToken) {
        $client = new Client([
            'headers' => [
                'Authorization' => 'Bearer ' . $accessToken,
                'Client-Id' => $this->clientId,
            ]
        ]);

        // Make request to Twitch API to get user information
        $response = $client->get('https://api.twitch.tv/helix/users');
        $body = json_decode($response->getBody(), true);
        return $body['data'][0]; // Return the first user (should be only one)
    }

    // this needs a comment
    public function checkTwitchChannel($username, $accessToken) {
        $client = new Client([
            'headers' => [
                'Authorization' => 'Bearer ' . $accessToken,
                'Client-Id' => $this->clientId,
            ]
        ]);

        try {
            // Make request to Twitch API to get user information
            $response = $client->get('https://api.twitch.tv/helix/users?login=' . $username);
            $body = json_decode($response->getBody(), true);
            
            // If the API returns data for this username, it's a valid channel
            return !empty($body['data']);
        } catch (Exception $e) {
            // If there's an error (e.g., invalid token), assume it's not a valid channel
            return false;
        }
    }
}
