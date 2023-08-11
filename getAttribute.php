Certainly! Here's an example PHP script using the Magento 2 API to get all custom attributes for a specific product by their attribute_set_id. This example demonstrates how you can retrieve custom attributes for a product using PHP and cURL.

```php
<?php

// Magento 2 API URL
$baseUrl = 'https://your-magento-domain.com/rest/V1';
$accessToken = 'YOUR_ACCESS_TOKEN';

// SKU of the product
$sku = 'your-product-sku';

// Set up cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "$baseUrl/products/$sku?fields=custom_attributes");
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $accessToken,
    'Content-Type: application/json',
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

// Execute the request
$response = curl_exec($ch);

// Check for errors
if (curl_errno($ch)) {
    echo 'Error: ' . curl_error($ch);
} else {
    // Decode the JSON response
    $data = json_decode($response, true);
    
    // Extract custom attributes
    $customAttributes = [];
    foreach ($data['custom_attributes'] as $attribute) {
        $customAttributes[$attribute['attribute_code']] = $attribute['value'];
    }
    
    // Print the custom attributes
    print_r($customAttributes);
}

// Close cURL
curl_close($ch);

?>
```

In this script:

- Replace `https://your-magento-domain.com` with the actual base URL of your Magento 2 installation.
- Replace `YOUR_ACCESS_TOKEN` with your actual integration access token.
- Replace `your-product-sku` with the SKU of the product for which you want to retrieve custom attributes.

This script uses cURL to make the API request and then processes the JSON response to extract and print the custom attributes.

To retrieve all custom attributes for products with a specific `attribute_set_id`, you would need to modify the API request to include the `searchCriteria` parameter with the desired `attribute_set_id` value. The exact implementation would depend on the Magento 2 API documentation for searching products by attribute set.

Please ensure you have proper error handling and security measures in place when using API requests in production environments.