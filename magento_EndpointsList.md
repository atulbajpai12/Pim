Magento Community Edition:

Catalog API:
Retrieve Product List: GET /rest/V1/products
Retrieve Product by SKU: GET /rest/V1/products/{sku}
Retrieve Category Tree: GET /rest/V1/categories
Customer API:
Create Customer: POST /rest/V1/customers
Retrieve Customer Information: GET /rest/V1/customers/{customerId}
Update Customer Information: PUT /rest/V1/customers/{customerId}
Cart and Checkout API:
Create Cart: POST /rest/V1/carts/mine
Add Item to Cart: POST /rest/V1/carts/mine/items
Estimate Shipping Methods: POST /rest/V1/carts/mine/estimate-shipping-methods
Order API:
Place Order: POST /rest/V1/carts/mine/order
Retrieve Order by ID: GET /rest/V1/orders/{orderId}
Retrieve Invoice List: GET /rest/V1/invoices
Magento Enterprise Edition (Additional to Community Edition):

Gift Card API:

Create Gift Card: POST /rest/V1/giftCards
Retrieve Gift Card by Code: GET /rest/V1/giftCards/{giftCardCode}
Reward Points API:

Retrieve Customer Points Balance: GET /rest/V1/rewardPoints/{customerId}
Retrieve Reward Points Transaction History: GET /rest/V1/rewardPoints/{customerId}/transactions
Customer Segmentation API:

Retrieve Customer Segment List: GET /rest/V1/customerSegment
Retrieve Customer Segment by ID: GET /rest/V1/customerSegment/{segmentId}
Advanced Reporting API:

Retrieve Sales Report: GET /rest/V1/advancedReporting/sales
Retrieve Customer Report: GET /rest/V1/advancedReporting/customer