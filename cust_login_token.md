>>>>Login via integratin token in magento 2

Certainly! I can provide a PHP example for customer login via integration token in Magento 2 and accessing the customer's dashboard. This example assumes you have already set up an integration in Magento and have the `Consumer Key` and `Consumer Secret` for authentication.

Here's a step-by-step guide:

**Step 1: Obtain an Access Token**

First, you need to obtain an access token using OAuth 1.0a authentication. You can use a library like `oauth1-client` to simplify the OAuth process. Make sure to install it via Composer:

```bash
composer require league/oauth1-client
```

Now, you can create a PHP script to obtain the access token:

```php
<?php

require 'vendor/autoload.php'; // Include the autoloader for the oauth1-client library

use League\OAuth1\Client\Server\Magento;
use League\OAuth1\Client\Credentials\TemporaryCredentials;

$consumerKey = 'YOUR_CONSUMER_KEY';
$consumerSecret = 'YOUR_CONSUMER_SECRET';

$baseUri = 'https://your-magento-site.com/';
$requestTokenUrl = $baseUri . 'oauth/token/request';
$authorizeUrl = $baseUri . 'oauth/authorize';
$accessTokenUrl = $baseUri . 'oauth/token/access';

$server = new Magento([
    'identifier' => $consumerKey,
    'secret' => $consumerSecret,
    'callback_uri' => 'oob',
]);

$temporaryCredentials = $server->getTemporaryCredentials();

// You should store these temporary credentials in the session for later use

$authorizationUrl = $server->getAuthorizationUrl($temporaryCredentials);

// Redirect the user to the authorization URL
header('Location: ' . $authorizationUrl);
exit;
```

Replace `'YOUR_CONSUMER_KEY'`, `'YOUR_CONSUMER_SECRET'`, and `'https://your-magento-site.com/'` with your actual integration credentials and Magento store URL.

**Step 2: Redirect and Authorize**

In the script above, the user will be redirected to the Magento login page to authorize the integration. After authorization, the user will receive a verifier code.

**Step 3: Exchange for an Access Token**

Create another PHP script to exchange the verifier code for an access token:

```php
<?php

require 'vendor/autoload.php';

use League\OAuth1\Client\Server\Magento;
use League\OAuth1\Client\Credentials\TemporaryCredentials;
use League\OAuth1\Client\Credentials\TokenCredentials;

$consumerKey = 'YOUR_CONSUMER_KEY';
$consumerSecret = 'YOUR_CONSUMER_SECRET';

$baseUri = 'https://your-magento-site.com/';
$requestTokenUrl = $baseUri . 'oauth/token/request';
$authorizeUrl = $baseUri . 'oauth/authorize';
$accessTokenUrl = $baseUri . 'oauth/token/access';

$server = new Magento([
    'identifier' => $consumerKey,
    'secret' => $consumerSecret,
    'callback_uri' => 'oob',
]);

$temporaryCredentials = new TemporaryCredentials();
$temporaryCredentials->setIdentifier($_GET['oauth_token']);
$temporaryCredentials->setSecret($_GET['oauth_token_secret']);

$tokenCredentials = $server->getTokenCredentials($temporaryCredentials, $_GET['oauth_verifier']);

$accessToken = $tokenCredentials->getIdentifier();
$accessTokenSecret = $tokenCredentials->getSecret();

// Now, you have the access token and access token secret

echo "Access Token: $accessToken<br>";
echo "Access Token Secret: $accessTokenSecret<br>";
```

This script will exchange the verifier code for an access token and access token secret. You can store these securely for later use.

**Step 4: Access Customer Dashboard**

To access the customer's dashboard, you can use the access token to make authenticated API requests. Here's an example of how to retrieve the customer's information:

```php
<?php

require 'vendor/autoload.php';

use GuzzleHttp\Client;

$accessToken = 'YOUR_ACCESS_TOKEN';
$baseUri = 'https://your-magento-site.com/rest/V1';

$client = new Client([
    'base_uri' => $baseUri,
    'headers' => [
        'Authorization' => 'Bearer ' . $accessToken,
    ],
]);

$response = $client->get('/customers/me');

// Handle the response and display customer information
if ($response->getStatusCode() === 200) {
    $customerData = json_decode($response->getBody(), true);
    echo "Customer Name: " . $customerData['firstname'] . ' ' . $customerData['lastname'];
} else {
    echo "Failed to retrieve customer information.";
}
```

Replace `'YOUR_ACCESS_TOKEN'` with the access token obtained earlier and `'https://your-magento-site.com/rest/V1'` with your Magento API Base URL.

This example retrieves the current customer's information. You can customize the API requests to access other customer-related data or perform additional actions.

Remember to handle errors and implement appropriate security measures when handling access tokens and integrating with Magento's API.