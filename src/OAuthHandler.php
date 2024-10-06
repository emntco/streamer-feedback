<?php

require '../vendor/autoload.php';
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class OAuthHandler {
    private $clientId;
    private $clientSecret;
    private $redirectUri;
    
    public function __construct() {
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
        return "https://id.twitch.tv/oauth2/authorize?response_type=code&client_id={$this->clientId}&redirect_uri={$this->redirectUri}&scope={$scopes}&state={$state}";
    }

    /**
     * Handles the Twitch OAuth callback and exchanges the code for an access token.
     * 
     * @param string $code The authorization code returned by Twitch after user login.
     * @return string Access token returned from Twitch.
     */
    public function handleCallback($code) {
        $client = new Client();

        try {
            $response = $client->post('https://id.twitch.tv/oauth2/token', [
                'form_params' => [
                    'client_id' => $this->clientId,
                    'client_secret' => $this->clientSecret,
                    'code' => $code,
                    'grant_type' => 'authorization_code',
                    'redirect_uri' => $this->redirectUri,
                ]
            ]);

            $body = json_decode($response->getBody(), true);
            return $body['access_token'];
        } catch (GuzzleException $e) {
            error_log("Error in handleCallback: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Retrieves the user's Twitch profile information using the access token.
     * 
     * @param string $accessToken The access token received after OAuth authentication.
     * @return array|null User profile information or null if an error occurs.
     */
    public function getUserInfo($accessToken) {
        $client = new Client([
            'headers' => [
                'Authorization' => 'Bearer ' . $accessToken,
                'Client-Id' => $this->clientId,
            ]
        ]);

        try {
            $response = $client->get('https://api.twitch.tv/helix/users');
            $body = json_decode($response->getBody(), true);
            return $body['data'][0] ?? null;
        } catch (GuzzleException $e) {
            error_log("Error in getUserInfo: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Checks if a given username corresponds to a valid Twitch channel.
     * 
     * @param string $username The Twitch username to check.
     * @param string $accessToken The access token for API authentication.
     * @return bool True if it's a valid channel, false otherwise.
     */
    public function checkTwitchChannel($username, $accessToken) {
        $client = new Client([
            'headers' => [
                'Authorization' => 'Bearer ' . $accessToken,
                'Client-Id' => $this->clientId,
            ]
        ]);

        try {
            $response = $client->get('https://api.twitch.tv/helix/users?login=' . urlencode($username));
            $body = json_decode($response->getBody(), true);
            
            // If the API returns data for this username, it's a valid channel
            return !empty($body['data']);
        } catch (GuzzleException $e) {
            error_log("Error in checkTwitchChannel: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Validates the given access token.
     * 
     * @param string $accessToken The access token to validate.
     * @return bool True if the token is valid, false otherwise.
     */
    public function validateToken($accessToken) {
        $client = new Client();

        try {
            $response = $client->get('https://id.twitch.tv/oauth2/validate', [
                'headers' => [
                    'Authorization' => 'OAuth ' . $accessToken
                ]
            ]);
            return $response->getStatusCode() === 200;
        } catch (GuzzleException $e) {
            error_log("Error in validateToken: " . $e->getMessage());
            return false;
        }
    }
}