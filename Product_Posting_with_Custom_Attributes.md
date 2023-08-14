Yes, you can definitely add custom attributes when creating products using the Magento REST API. Magento supports custom attributes, allowing you to extend the product data with additional fields that are specific to your business needs.

Here's how you can include custom attributes when creating a product using the Magento REST API in Postman:

1. **Identify Custom Attribute Codes:**
   First, make sure you know the codes (identifiers) of the custom attributes you want to include. These codes are defined when you create the custom attributes in your Magento admin panel.

2. **Include Custom Attributes in the Request Body:**
   In your Postman request body, include the custom attributes along with the standard product data. You need to provide the custom attribute codes as keys in the `custom_attributes` array. Here's an example:

   ```json
   {
       "product": {
           "sku": "new-product-sku",
           "name": "New Product",
           "price": 19.99,
           "attribute_set_id": 4,
           "status": 1,
           "visibility": 4,
           "type_id": "simple",
           "weight": 0.5,
           "custom_attributes": [
               {
                   "attribute_code": "custom_attribute_code_1",
                   "value": "Custom Value 1"
               },
               {
                   "attribute_code": "custom_attribute_code_2",
                   "value": "Custom Value 2"
               }
           ]
       }
   }
   ```

   Replace `"custom_attribute_code_1"` and `"custom_attribute_code_2"` with the actual codes of your custom attributes. Include as many custom attributes as needed.

3. **Send the Request:**
   With the custom attributes included in the request body, you can send the POST request as described earlier.

Remember to ensure that the attribute codes you use in the request match the custom attributes you've defined in your Magento instance. Also, ensure that the values you provide are compatible with the attribute types you've defined (e.g., text, dropdown, etc.).

As always, for the most accurate and up-to-date information on working with custom attributes and API requests in Magento, refer to the official Magento API documentation for your version.