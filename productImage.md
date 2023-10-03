.... Get product with images

To retrieve product images along with other product information using the Magento 2 Integration API, you can make additional requests to fetch image URLs based on the product data you have. Here's how you can modify the previous example to include product images:

**Step 1: Retrieve Product Data**

First, retrieve the basic product data using the `/V1/products` endpoint as shown in the previous example.

```php
// Replace with your access token and Magento API Base URL
$accessToken = 'YOUR_ACCESS_TOKEN';
$baseApiUrl = 'https://your-magento-site.com/rest/V1';

$apiUrl = $baseApiUrl . '/products';

$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $accessToken,
]);

$response = curl_exec($ch);

if (curl_errno($ch)) {
    echo 'Error: ' . curl_error($ch);
} else {
    // Process the API response (e.g., decode JSON)
    $products = json_decode($response, true);

    // Iterate through products
    foreach ($products as $product) {
        echo 'Product ID: ' . $product['id'] . '<br>';
        echo 'Product Name: ' . $product['name'] . '<br>';
        // Add more product attributes as needed
        echo '<br>';
    }
}

curl_close($ch);
```

**Step 2: Retrieve Product Images**

For each product, you can retrieve its images by making an additional request to the `/V1/products/{sku}/media` endpoint, where `{sku}` is the SKU of the product you want to fetch images for. Here's how to do that inside the loop:

```php
foreach ($products as $product) {
    echo 'Product ID: ' . $product['id'] . '<br>';
    echo 'Product Name: ' . $product['name'] . '<br>';

    // Retrieve product images
    $sku = $product['sku'];
    $imageApiUrl = $baseApiUrl . '/products/' . $sku . '/media';

    $chImages = curl_init($imageApiUrl);
    curl_setopt($chImages, CURLOPT_CUSTOMREQUEST, 'GET');
    curl_setopt($chImages, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($chImages, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $accessToken,
    ]);

    $imageResponse = curl_exec($chImages);

    if (curl_errno($chImages)) {
        echo 'Error: ' . curl_error($chImages);
    } else {
        // Process the image API response (e.g., decode JSON)
        $productImages = json_decode($imageResponse, true);

        // Output product image URLs
        if (is_array($productImages)) {
            foreach ($productImages as $image) {
                echo 'Image URL: ' . $image['url'] . '<br>';
            }
        } else {
            echo 'No images found for this product.';
        }
    }

    curl_close($chImages);

    echo '<br>';
}
```

This code will fetch and display the image URLs for each product. You can customize the way you handle and display images based on your application's requirements.

Remember to replace `'YOUR_ACCESS_TOKEN'` and `'https://your-magento-site.com/rest/V1'` with your actual access token and Magento API Base URL.