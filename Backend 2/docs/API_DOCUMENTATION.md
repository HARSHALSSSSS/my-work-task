# SpeedCopy — Complete API Documentation

**Base URL:** `http://localhost:4000`
**Auth:** All protected routes need `Authorization: Bearer <token>` header.
**Response format:** All APIs return `{ success, message, data }`.

---

## Authentication

Get a token first. All subsequent requests use this token.

### Standard Response Shape
```json
{ "success": true, "message": "...", "data": { ... } }
```

### Error Response Shape
```json
{ "success": false, "message": "Error description" }
```

---

## 1. AUTH

### POST /api/auth/register
Register with email + password (no Firebase needed).

**Body:**
```json
{ "name": "Rahul Sharma", "email": "rahul@example.com", "password": "pass123", "role": "user" }
```
`role` options: `user` | `vendor` | `delivery_partner`

**Response:**
```json
{
  "data": {
    "user": { "_id": "...", "name": "Rahul Sharma", "email": "rahul@example.com", "role": "user" },
    "token": "eyJhbGci..."
  }
}
```

---

### POST /api/auth/login
Login with email + password.

**Body:**
```json
{ "email": "rahul@example.com", "password": "pass123" }
```

**Response:** Same as register — returns `user` + `token`.

---

### POST /api/auth/verify
Firebase login exchange. Send the Firebase ID token once, get back a short internal JWT.

**Headers:**
```txt
Authorization: Bearer <firebase_id_token>
```

**Body (optional):**
```json
{ "role": "user" }
```
**Mock mode:** Use `Authorization: Bearer mock_user001_user` (format: `mock_<uid>_<role>`)

**Response:** Returns the short JWT to use on every protected API after login.
```json
{
  "data": {
    "token": "eyJhbGci..."
  }
}
```

**Important:** Do not send the Firebase token to normal APIs after this. Use the returned short JWT in `Authorization: Bearer <token>`.

---

### GET /api/auth/me 🔒
Get current logged-in user profile.

**Response:**
```json
{ "data": { "user": { "_id": "...", "name": "...", "email": "...", "role": "user", "isActive": true } } }
```

---

### PATCH /api/auth/users/:id/role 🔒 ADMIN
Update a user's role.

**Body:** `{ "role": "vendor" }`

---

### PATCH /api/auth/users/:id/status 🔒 ADMIN
Activate or deactivate a user.

**Body:** `{ "isActive": false }`

---

## 2. USER PROFILE & ADDRESSES

### GET /api/users/profile 🔒
Get current user's extended profile.

**Response:**
```json
{ "data": { "userId": "...", "name": "Rahul", "phone": "+91-9876543210", "gender": "male", "preferences": { "notifications": true } } }
```

---

### PUT /api/users/profile 🔒
Update profile.

**Body:**
```json
{ "name": "Rahul Sharma", "phone": "+91-9876543210", "gender": "male", "dateOfBirth": "1995-06-15" }
```

---

### GET /api/users/addresses 🔒
Get all saved addresses.

**Response:**
```json
{ "data": [{ "_id": "...", "label": "Home", "fullName": "Rahul", "line1": "123 MG Road", "city": "New Delhi", "pincode": "110001", "isDefault": true }] }
```

---

### POST /api/users/addresses 🔒
Add a new address.

**Body:**
```json
{
  "label": "Home",
  "fullName": "Rahul Sharma",
  "phone": "+91-9876543210",
  "line1": "123 MG Road",
  "line2": "Near Metro",
  "city": "New Delhi",
  "state": "Delhi",
  "pincode": "110001",
  "isDefault": true
}
```

---

### PUT /api/users/addresses/:id 🔒
Update an address. Same body as POST (all fields optional).

---

### DELETE /api/users/addresses/:id 🔒
Delete an address.

---

## 3. PRODUCTS & CATEGORIES

### GET /api/products/categories
Get all categories. Filter by `flowType`.

**Query:** `?flowType=printing` | `gifting` | `shopping`

**Response:**
```json
{ "data": [{ "_id": "...", "name": "Printing", "slug": "printing", "flowType": "printing" }] }
```

---

### GET /api/products/categories/:id/subcategories
Get subcategories for a category.

---

### GET /api/products
List all products. Supports filtering.

**Query:** `?flowType=printing&category=<id>&search=business+card&page=1&limit=20`

**Response:**
```json
{
  "data": {
    "products": [{ "_id": "...", "name": "Business Card", "basePrice": 80, "flowType": "printing", "requiresDesign": true }],
    "meta": { "total": 50, "page": 1, "limit": 20, "totalPages": 3 }
  }
}
```

---

### GET /api/products/:id
Get single product with variants.

**Response:**
```json
{
  "data": {
    "_id": "...", "name": "Business Card Premium", "basePrice": 80, "discountedPrice": 70,
    "flowType": "printing", "requiresDesign": true, "businessPrintType": "business_card",
    "variants": [{ "_id": "...", "name": "A4 - Color", "price": 90 }]
  }
}
```

---

### POST /api/products 🔒 ADMIN
Create a product.

**Body:**
```json
{
  "name": "Business Card Premium", "category": "<categoryId>",
  "flowType": "printing", "businessPrintType": "business_card",
  "designMode": "both", "requiresDesign": true,
  "basePrice": 80, "discountedPrice": 70
}
```

---

### PUT /api/products/:id 🔒 ADMIN
Update product. Same body as POST (all fields optional).

---

### DELETE /api/products/:id 🔒 ADMIN
Soft-delete a product.

---

## 4. SHOPPING FLOW

### GET /api/shop/home
Home page data — banners, categories, trending products.

**Response:**
```json
{ "data": { "banners": [...], "categories": [...], "trending": [...], "deals": [...] } }
```

---

### GET /api/shop/categories
All shopping categories.

---

### GET /api/shop/products
List shopping products.

**Query:** `?category=<id>&page=1&limit=20`

---

### GET /api/shop/products/:slug
Get product by slug.

---

### GET /api/shop/search
Search shopping products.

**Query:** `?q=notebook&category=<id>&page=1&limit=20`

---

### GET /api/shop/deals
Current deals/offers.

---

### GET /api/shop/trending
Trending products.

---

### POST /api/shop/orders 🔒
Create a shopping order directly (without cart).

**Body:**
```json
{
  "items": [{ "productId": "...", "variantId": "...", "quantity": 2, "unitPrice": 120, "totalPrice": 240 }],
  "shippingAddress": { "fullName": "Rahul", "phone": "+91-9876543210", "line1": "123 MG Road", "city": "New Delhi", "state": "Delhi", "pincode": "110001" },
  "subtotal": 240, "deliveryCharge": 40, "total": 280
}
```

---

## 5. GIFTING FLOW

### GET /api/gifting/home
Gifting home page data.

---

### GET /api/gifting/categories
Gifting categories.

---

### GET /api/gifting/products
List gifting products.

**Query:** `?category=<id>&page=1&limit=20`

---

### GET /api/gifting/products/:identifier
Get gifting product (by ID or slug).

---

### GET /api/gifting/search
Search gifting products.

**Query:** `?q=mug&category=<id>`

---

### POST /api/gifting/orders 🔒
Create gifting order (requires design).

**Body:**
```json
{
  "items": [{ "productId": "...", "designId": "...", "quantity": 1, "unitPrice": 299, "totalPrice": 299 }],
  "shippingAddress": { ... },
  "subtotal": 299, "deliveryCharge": 50, "total": 349
}
```

---

## 6. DOCUMENT PRINTING FLOW

Step-by-step flow: select type → upload files → configure → add to cart → order.

### GET /api/printing/document-types
Get all 4 print types with their options.

**Response:**
```json
{
  "data": [
    {
      "id": "standard_printing", "name": "Standard Printing",
      "options": { "colorModes": ["bw","color"], "pageSizes": ["a4","a3"], "printSides": ["one_sided","two_sided"], "outputTypes": ["loose_paper","stapled"] }
    },
    { "id": "soft_binding", ... },
    { "id": "spiral_binding", ... },
    { "id": "thesis_binding", ... }
  ]
}
```

---

### GET /api/printing/service-packages
Delivery packages.

**Response:**
```json
{ "data": [{ "id": "standard", "name": "Standard", "price": 40, "eta": "2-3 days" }, { "id": "express", "price": 80, "eta": "Same day" }, { "id": "instant", "price": 150, "eta": "2 hours" }] }
```

---

### GET /api/printing/pickup-locations
Nearest shops.

**Query:** `?lat=28.6139&lng=77.2090&radius=10` OR `?pincode=110001`

**Response:**
```json
{ "data": [{ "_id": "...", "name": "SpeedCopy - Connaught Place", "address": "Block A, CP", "city": "New Delhi", "phone": "+91-9876543210", "workingHours": "9AM-9PM" }] }
```

---

### POST /api/printing/upload 🔒
Upload print files (PDF, DOCX, JPG, PNG). Multipart form.

**Form field:** `files` (multiple files allowed, max 10)

**Response:**
```json
{ "data": { "files": [{ "originalName": "doc.pdf", "url": "https://...", "size": 1024000, "mimeType": "application/pdf" }] } }
```

---

### POST /api/printing/configure 🔒
Save print configuration. Returns `configId` for cart/order.

**Body (Standard Printing - Delivery):**
```json
{
  "printType": "standard_printing",
  "files": [{ "originalName": "doc.pdf", "url": "https://...", "size": 1024000, "mimeType": "application/pdf" }],
  "colorMode": "bw",
  "pageSize": "a4",
  "printSide": "two_sided",
  "printOutputType": "stapled",
  "copies": 2,
  "specialInstructions": "Use 80gsm paper",
  "deliveryMethod": "delivery",
  "servicePackage": "express"
}
```

**Body (Spiral Binding - Pickup):**
```json
{
  "printType": "spiral_binding",
  "files": [...],
  "colorMode": "color",
  "pageSize": "a4",
  "printSide": "two_sided",
  "coverPage": "transparent_sheet",
  "copies": 1,
  "deliveryMethod": "pickup",
  "shopId": "<shopId>"
}
```

**Body (Thesis Binding):**
```json
{
  "printType": "thesis_binding",
  "files": [...],
  "colorMode": "bw",
  "pageSize": "a4",
  "printSide": "two_sided",
  "bindingCover": "black_gold",
  "cdRequired": "need",
  "copies": 3,
  "deliveryMethod": "delivery",
  "servicePackage": "standard"
}
```

**Response:**
```json
{ "data": { "_id": "<configId>", "estimatedPrice": 85, "status": "draft" } }
```

---

### GET /api/printing/config/:id 🔒
Get saved print config (for checkout summary).

---

## 7. BUSINESS PRINTING FLOW

### GET /api/business-printing/types
All business print types (Business Card, Flyers, Brochures, etc.)

---

### GET /api/business-printing/products
List business printing products.

**Query:** `?type=business_card&page=1&limit=20`

---

### GET /api/business-printing/products/:id
Get single business printing product with design options.

---

### GET /api/business-printing/service-packages
Delivery packages (same as document printing).

---

### GET /api/business-printing/pickup-locations
Nearest shops. Same query params as document printing.

---

### POST /api/business-printing/configure 🔒
Save business print config after design is finalized.

**Body:**
```json
{
  "productId": "<productId>",
  "productName": "Business Card Premium",
  "businessPrintType": "business_card",
  "designType": "premium",
  "designId": "<designId>",
  "selectedOptions": { "size": "Standard (3.5 x 2 in)", "paperType": "Glossy", "finish": "UV Coating", "sides": "Double-sided" },
  "quantity": 100,
  "unitPrice": 0.8,
  "totalPrice": 80,
  "deliveryMethod": "delivery",
  "servicePackage": "express"
}
```

**Response:**
```json
{ "data": { "_id": "<configId>", "totalPrice": 80, "status": "draft" } }
```

---

### GET /api/business-printing/config/:id 🔒
Get saved business print config.

---

## 8. DESIGN SERVICE

### GET /api/designs/templates
Get design templates.

**Query:** `?flowType=business_printing&category=business_card&isPremium=true&productId=<id>`

**Response:**
```json
{ "data": [{ "_id": "...", "name": "Modern Blue", "category": "business_card", "isPremium": true, "previewImage": "https://...", "dimensions": { "width": 89, "height": 51, "unit": "mm" } }] }
```

---

### GET /api/designs/templates/premium
Premium templates for a product.

**Query:** `?productId=<id>&category=business_card`

---

### POST /api/designs/blank 🔒
Create blank canvas.

**Body:**
```json
{ "productId": "<id>", "flowType": "business_printing", "dimensions": { "width": 89, "height": 51, "unit": "mm" } }
```

**Response:**
```json
{ "data": { "_id": "<designId>", "canvasJson": { "version": "5.3.0", "objects": [], "background": "#ffffff" }, "isFinalized": false } }
```

---

### POST /api/designs/from-template 🔒
Create design from premium template (canvas pre-filled).

**Body:**
```json
{ "productId": "<id>", "templateId": "<templateId>", "flowType": "business_printing" }
```

---

### POST /api/designs 🔒
Save full canvas JSON.

**Body:**
```json
{
  "productId": "<id>", "flowType": "business_printing", "designType": "normal",
  "name": "My Business Card",
  "canvasJson": { "version": "5.3.0", "objects": [...], "background": "#ffffff" },
  "previewImage": "data:image/png;base64,...",
  "isFinalized": true
}
```

---

### GET /api/designs 🔒
Get all designs for current user.

**Query:** `?productId=<id>`

---

### GET /api/designs/:id 🔒
Get design by ID with canvas JSON.

---

### PUT /api/designs/:id 🔒
Update/re-edit a design.

---

## 9. CART

### GET /api/orders/cart 🔒
Get current cart.

**Response:**
```json
{
  "data": {
    "userId": "...", "subtotal": 598,
    "items": [{
      "_id": "<itemId>", "productId": "...", "productName": "Custom Mug",
      "flowType": "gifting", "designId": "...", "quantity": 2,
      "unitPrice": 299, "totalPrice": 598
    }]
  }
}
```

---

### POST /api/orders/cart 🔒
Add item to cart.

**Body (Document Printing):**
```json
{ "productId": "...", "productName": "Standard Printing", "flowType": "printing", "printConfigId": "<configId>", "quantity": 1, "unitPrice": 85, "totalPrice": 85 }
```

**Body (Business Printing):**
```json
{ "productId": "...", "productName": "Business Card", "flowType": "printing", "businessPrintConfigId": "<configId>", "quantity": 1, "unitPrice": 80, "totalPrice": 80 }
```

**Body (Gifting):**
```json
{ "productId": "...", "productName": "Custom Mug", "flowType": "gifting", "designId": "<designId>", "quantity": 2, "unitPrice": 299, "totalPrice": 598 }
```

**Body (Shopping):**
```json
{ "productId": "...", "productName": "A4 Notebook", "flowType": "shopping", "variantId": "...", "quantity": 3, "unitPrice": 120, "totalPrice": 360 }
```

---

### PATCH /api/orders/cart/:itemId 🔒
Update item quantity.

**Body:** `{ "quantity": 3 }`

---

### DELETE /api/orders/cart/:itemId 🔒
Remove item from cart.

---

### DELETE /api/orders/cart/clear 🔒
Clear entire cart.

---

### POST /api/orders/cart/apply-coupon 🔒
Apply coupon code.

**Body:**
```json
{ "code": "SAVE10", "subtotal": 598, "flowType": "gifting" }
```

**Response:**
```json
{ "data": { "couponCode": "SAVE10", "discountType": "percentage", "discountValue": 10, "discount": 59.8, "finalTotal": 538.2 } }
```

---

## 10. ORDERS

### POST /api/orders 🔒
Place an order.

**Body:**
```json
{
  "items": [{
    "productId": "...", "productName": "Standard Printing",
    "flowType": "printing", "printConfigId": "<configId>",
    "quantity": 1, "unitPrice": 85, "totalPrice": 85
  }],
  "shippingAddress": {
    "fullName": "Rahul Sharma", "phone": "+91-9876543210",
    "line1": "123 MG Road", "city": "New Delhi", "state": "Delhi", "pincode": "110001"
  },
  "subtotal": 85, "discount": 0, "deliveryCharge": 40, "total": 125,
  "couponCode": "SAVE10",
  "notes": "Please pack carefully"
}
```

**Pickup order:** Replace `shippingAddress` with `"pickupShopId": "<shopId>"` and set `deliveryCharge: 0`.

**Response:**
```json
{ "data": { "_id": "<orderId>", "orderNumber": "SC17000001", "status": "pending", "paymentStatus": "unpaid", "total": 125 } }
```

---

### GET /api/orders 🔒
Get current user's orders.

**Query:** `?status=pending&page=1&limit=10`

---

### GET /api/orders/:id 🔒
Get order details.

**Response:**
```json
{
  "data": {
    "_id": "...", "orderNumber": "SC17000001", "status": "confirmed",
    "paymentStatus": "paid", "items": [...], "shippingAddress": {...},
    "subtotal": 85, "deliveryCharge": 40, "total": 125,
    "timeline": [{ "status": "pending", "note": "Order placed", "timestamp": "..." }]
  }
}
```

---

### GET /api/orders/:id/track 🔒
Track order — returns status, timeline, ETA.

**Response:**
```json
{
  "data": {
    "orderNumber": "SC17000001", "status": "out_for_delivery",
    "timeline": [...], "estimatedDelivery": "2026-04-18",
    "deliveryEtaMinutes": 15, "deliveryDistanceKm": 3.2
  }
}
```

---

### POST /api/orders/:id/reorder 🔒
Reorder a previous order (creates new order with same items).

---

### PATCH /api/orders/:id/status 🔒 ADMIN
Update order status.

**Body:** `{ "status": "assigned_vendor", "note": "Assigned to PrintMaster" }`

**Status flow:**
```
pending → confirmed → assigned_vendor → vendor_accepted → in_production → qc_pending → ready_for_pickup → delivery_assigned → out_for_delivery → delivered
                                                                                                                              ↓
                                                                                                                         cancelled / refunded
```

---

## 11. PAYMENTS

### POST /api/payments/create 🔒
Create Razorpay payment order.

**Body:**
```json
{ "orderId": "<orderId>", "amount": 125, "currency": "INR" }
```

**Response:**
```json
{
  "data": {
    "razorpayOrderId": "order_mock_...",
    "amount": 12500,
    "currency": "INR",
    "keyId": "rzp_test_...",
    "mock": true
  }
}
```

---

### POST /api/payments/verify 🔒
Verify payment after Razorpay checkout. Automatically marks order as `confirmed`.

**Body:**
```json
{
  "razorpayOrderId": "order_mock_...",
  "razorpayPaymentId": "pay_mock_...",
  "razorpaySignature": "signature_from_razorpay"
}
```

**Mock mode:** Any values work for `razorpayPaymentId` and `razorpaySignature`.

**Response:**
```json
{ "data": { "status": "paid", "orderId": "<orderId>", "razorpayPaymentId": "pay_mock_..." } }
```

> After verify succeeds, order-service is automatically called to set `paymentStatus: paid` and `status: confirmed`.

---

## 12. VENDOR — ORDER MANAGEMENT

Vendor sees only orders assigned to them.

### GET /api/vendor/orders/queue 🔒 VENDOR
Get orders assigned to this vendor.

**Query:** `?status=assigned_vendor&page=1&limit=20`

**Response:**
```json
{ "data": { "orders": [{ "_id": "...", "orderNumber": "SC17000001", "status": "assigned_vendor", "items": [...] }], "meta": {...} } }
```

---

### GET /api/vendor/orders/:id 🔒 VENDOR
Get specific order details.

---

### POST /api/vendor/orders/:id/accept 🔒 VENDOR
Accept an assigned order. Status → `vendor_accepted`.

---

### POST /api/vendor/orders/:id/reject 🔒 VENDOR
Reject an order. Status → `cancelled`.

**Body:** `{ "reason": "Out of stock" }`

---

### PATCH /api/vendor/orders/:id/start-production 🔒 VENDOR
Start production. Status → `in_production`.

---

### PATCH /api/vendor/orders/:id/qc-pending 🔒 VENDOR
Mark quality check. Status → `qc_pending`.

---

### PATCH /api/vendor/orders/:id/ready-for-pickup 🔒 VENDOR
Mark ready for delivery partner. Status → `ready_for_pickup`.

---

## 13. VENDOR — ORG, STORES & STAFF

### GET /api/vendor/org/profile 🔒 VENDOR
Get vendor organization profile.

**Response:**
```json
{ "data": { "_id": "...", "businessName": "PrintMaster", "gstNumber": "29ABCDE...", "isApproved": true, "priority": 5 } }
```

---

### PUT /api/vendor/org/profile 🔒 VENDOR
Update org profile.

**Body:**
```json
{ "businessName": "PrintMaster Solutions", "gstNumber": "29ABCDE1234F1Z5", "contactName": "Amit Kumar", "contactEmail": "amit@printmaster.com", "contactPhone": "+91-9876543210" }
```

---

### GET /api/vendor/stores 🔒 VENDOR
Get all stores.

---

### POST /api/vendor/stores 🔒 VENDOR
Create a store.

**Body:**
```json
{
  "name": "PrintMaster - Connaught Place",
  "address": { "line1": "Block A, CP", "city": "New Delhi", "state": "Delhi", "pincode": "110001" },
  "location": { "lat": 28.6315, "lng": 77.2167 },
  "phone": "+91-9876543210",
  "workingHours": "9:00 AM - 9:00 PM",
  "workingDays": ["Mon","Tue","Wed","Thu","Fri","Sat"],
  "supportedFlows": ["printing", "gifting"],
  "capacity": { "maxOrdersPerDay": 50 }
}
```

---

### GET /api/vendor/stores/nearby
Find nearby vendor stores (public, no auth).

**Query:** `?lat=28.6139&lng=77.2090&radius=10&limit=20`

---

### PATCH /api/vendor/stores/:id/status 🔒 VENDOR
Activate/deactivate store. **Body:** `{ "isActive": false }`

---

### PUT /api/vendor/stores/:id/capacity 🔒 VENDOR
Update capacity. **Body:** `{ "maxOrdersPerDay": 80, "currentLoad": 12 }`

---

### PATCH /api/vendor/stores/:id/availability 🔒 VENDOR
Toggle availability. **Body:** `{ "isAvailable": false }`

---

### GET /api/vendor/staff 🔒 VENDOR
Get all staff members.

---

### POST /api/vendor/staff 🔒 VENDOR
Add staff member.

**Body:**
```json
{ "name": "Suresh", "email": "suresh@printmaster.com", "phone": "+91-9876543211", "role": "operator", "storeId": "<storeId>" }
```
`role` options: `manager` | `operator` | `qc`

---

### PATCH /api/vendor/staff/:id/status 🔒 VENDOR
Activate/deactivate staff. **Body:** `{ "isActive": false }`

---

### GET /api/vendor/analytics/performance 🔒 VENDOR
Performance stats.

**Response:**
```json
{ "data": { "totalStores": 3, "activeStores": 2, "totalStaff": 8 } }
```

---

## 14. DELIVERY PARTNER

### GET /api/delivery/tasks/available 🔒 DELIVERY
List available tasks to accept.

**Query:** `?page=1&limit=20`

**Response:**
```json
{ "data": { "items": [{ "id": "...", "orderId": "...", "status": "pending_assignment", "pickup": { "name": "PrintMaster CP", "addressLine": "Block A, CP", "location": { "lat": 28.63, "lng": 77.21 } }, "dropoff": { "name": "Rahul Sharma", "addressLine": "123 MG Road", "location": { "lat": 28.64, "lng": 77.22 } }, "etaMinutes": 25, "distanceKm": 4.2 }] } }
```

---

### POST /api/delivery/tasks/accept 🔒 DELIVERY
Accept a task.

**Body:** `{ "taskId": "<taskId>" }`

---

### GET /api/delivery/tasks/current 🔒 DELIVERY
Get current active task.

---

### GET /api/delivery/tasks/mine 🔒 DELIVERY
Get all tasks (history).

**Query:** `?status=delivered&page=1&limit=20`

---

### GET /api/delivery/tasks/:taskId 🔒 DELIVERY
Get task details.

---

### POST /api/delivery/tasks/:taskId/arrived-pickup 🔒 DELIVERY
Mark arrived at pickup location.

---

### POST /api/delivery/tasks/:taskId/confirm-pickup 🔒 DELIVERY
Confirm items picked up.

**Body:** `{ "checkedItemIds": ["item1", "item2"] }`

---

### POST /api/delivery/tasks/:taskId/location 🔒 DELIVERY
Update live location (call every 10-15 seconds while delivering).

**Body:**
```json
{ "lat": 28.6315, "lng": 77.2167, "heading": 90, "speedKmph": 25, "etaMinutes": 8, "distanceKm": 2.4 }
```

---

### POST /api/delivery/tasks/:taskId/mark-delivered 🔒 DELIVERY
Mark order as delivered. Status → `delivered`.

---

### POST /api/delivery/tasks/:taskId/sos 🔒 DELIVERY
Raise SOS alert.

**Body:** `{ "message": "Vehicle breakdown near MG Road" }`

---

### GET /api/delivery/track/:orderId
Track delivery by order ID (public — for customer tracking page).

**Response:**
```json
{ "data": { "status": "out_for_delivery", "riderId": "...", "etaMinutes": 12, "distanceKm": 2.1, "latestLocation": { "lat": 28.63, "lng": 77.21, "at": "..." } } }
```

---

## 15. NOTIFICATIONS & SUPPORT TICKETS

### GET /api/notifications 🔒
Get user notifications.

**Query:** `?isRead=false&page=1&limit=20`

**Response:**
```json
{ "data": { "notifications": [{ "_id": "...", "type": "in_app", "title": "Order delivered", "message": "Your order SC17000001 has been delivered.", "isRead": false, "createdAt": "..." }], "meta": {...} } }
```

---

### PATCH /api/notifications/:id/read 🔒
Mark one notification as read.

---

### PATCH /api/notifications/read-all 🔒
Mark all notifications as read.

---

### POST /api/tickets 🔒
Create a support ticket.

**Body:**
```json
{
  "subject": "Order not delivered",
  "description": "My order SC17000001 was supposed to arrive yesterday.",
  "category": "delivery_issue",
  "priority": "high",
  "orderId": "<orderId>"
}
```
`category`: `order_issue` | `payment_issue` | `delivery_issue` | `product_issue` | `account_issue` | `other`
`priority`: `low` | `medium` | `high` | `urgent`

**Response:**
```json
{ "data": { "_id": "<ticketId>", "status": "open", "subject": "Order not delivered", "replies": [] } }
```

---

### GET /api/tickets 🔒
Get tickets. Customers see own tickets; admin/staff see all.

**Query:** `?status=open&page=1&limit=10`

---

### GET /api/tickets/:id 🔒
Get ticket with all replies.

---

### POST /api/tickets/:id/reply 🔒
Reply to a ticket.

**Body:** `{ "message": "I still haven't received any update." }`

---

## 16. WALLET & REFERRALS

### GET /api/wallet 🔒
Get wallet balance.

**Response:**
```json
{ "data": { "_id": "...", "userId": "...", "balance": 250.00, "currency": "INR" } }
```

---

### GET /api/wallet/ledger 🔒
Get transaction history.

**Query:** `?category=refund&page=1&limit=20`

**Response:**
```json
{
  "data": {
    "wallet": { "balance": 250 },
    "entries": [{
      "_id": "...", "type": "credit", "category": "refund",
      "amount": 85, "balanceBefore": 165, "balanceAfter": 250,
      "description": "Order refund", "createdAt": "..."
    }],
    "meta": {...}
  }
}
```

---

### GET /api/referrals 🔒
Get my referral code and referral history.

**Response:**
```json
{ "data": { "myCode": "SCABC1XY2Z", "referrals": [...], "meta": {...} } }
```

---

### POST /api/referrals/apply 🔒
Apply someone else's referral code (on signup).

**Body:** `{ "code": "SCABC1XY2Z" }`

---

## 17. VENDOR FINANCE

### GET /api/vendor/finance/summary 🔒 VENDOR
Finance summary.

**Response:**
```json
{ "data": { "pendingPayout": 1200.00, "totalPaid": 8500.00, "totalPayouts": 12, "platformFeePercent": 10 } }
```

---

### GET /api/vendor/finance/payout-history 🔒 VENDOR
Payout history.

**Query:** `?page=1&limit=10`

**Response:**
```json
{ "data": { "payouts": [{ "_id": "...", "amount": 1000, "platformFee": 100, "netAmount": 900, "status": "paid", "transferredAt": "..." }], "meta": {...} } }
```

---

## 18. ADMIN PANEL

All admin routes require admin JWT.

### GET /api/admin/dashboard 🔒 ADMIN
Platform overview.

**Response:**
```json
{ "data": { "totalUsers": 1250, "totalOrders": 3400, "totalProducts": 85, "totalRevenue": 425000, "ordersByStatus": { "pending": 12, "confirmed": 45, "delivered": 3200 } } }
```

---

### GET /api/admin/orders 🔒 ADMIN
All orders with filters.

**Query:** `?status=pending&vendorId=<id>&userId=<id>&page=1&limit=20`

---

### PATCH /api/admin/orders/:id/reassign-vendor 🔒 ADMIN
Reassign order to different vendor.

**Body:** `{ "vendorId": "<vendorId>", "storeId": "<storeId>" }`

---

### PATCH /api/admin/orders/:id/cancel 🔒 ADMIN
Cancel order. **Body:** `{ "reason": "Customer requested" }`

---

### PATCH /api/admin/orders/:id/refund 🔒 ADMIN
Mark as refunded. **Body:** `{ "refundId": "rfnd_001" }`

---

### GET /api/admin/vendors 🔒 ADMIN
All vendors. **Query:** `?isApproved=true&isSuspended=false&page=1&limit=20`

---

### PATCH /api/admin/vendors/:id/suspend 🔒 ADMIN
Suspend vendor. **Body:** `{ "reason": "Quality complaints" }`

---

### PATCH /api/admin/vendors/:id/priority 🔒 ADMIN
Set assignment priority. **Body:** `{ "priority": 10 }`

---

### GET /api/admin/customers 🔒 ADMIN
All customers. **Query:** `?search=rahul&isActive=true&page=1&limit=20`

---

### PATCH /api/admin/customers/:id/restrict 🔒 ADMIN
Restrict customer. **Body:** `{ "isActive": false, "reason": "Fraudulent activity" }`

---

### GET /api/admin/staff 🔒 ADMIN
All staff members.

---

### POST /api/admin/staff 🔒 ADMIN
Create staff. **Body:** `{ "name": "Priya", "email": "priya@speedcopy.com", "role": "staff" }`

---

### PATCH /api/admin/staff/:id/role 🔒 ADMIN
Update staff role. **Body:** `{ "role": "admin" }`

---

### GET /api/admin/control 🔒 ADMIN
Get system state (flags, paused cities).

---

### PATCH /api/admin/control/order-intake 🔒 ADMIN
Toggle order intake. **Body:** `{ "enabled": false }`

---

### PATCH /api/admin/control/city-pause 🔒 ADMIN
Pause a city. **Body:** `{ "city": "Mumbai", "paused": true }`

---

### PATCH /api/admin/control/feature-flags 🔒 ADMIN
Update feature flags. **Body:** `{ "gifting": true, "shopping": true, "printing": true, "referrals": true, "wallet": true }`

---

### GET /api/admin/reports 🔒 ADMIN
Revenue and order reports.

**Query:** `?from=2026-01-01&to=2026-12-31`

**Response:**
```json
{ "data": { "revenueByDay": [{ "_id": "2026-04-17", "revenue": 12500, "count": 45 }], "ordersByStatus": [...], "ordersByFlow": [...] } }
```

---

### GET /api/admin/finance/summary 🔒 ADMIN
Platform finance. **Response:** `{ "totalGrossRevenue": 425000, "pendingPayouts": 12000, "paidPayouts": 380000 }`

---

### POST /api/admin/refunds/:orderId 🔒 ADMIN
Process refund to customer wallet.

**Body:** `{ "amount": 125, "customerId": "<userId>", "reason": "Order cancelled" }`

---

---

## QUICK REFERENCE

### Auth Headers
```
Authorization: Bearer <token>
```

### Role-based Access
| Symbol | Meaning |
|--------|---------|
| 🔒 | Requires login (any role) |
| 🔒 ADMIN | Requires admin role |
| 🔒 VENDOR | Requires vendor role |
| 🔒 DELIVERY | Requires delivery_partner role |
| (no symbol) | Public — no auth needed |

### Order Status Flow
```
pending → confirmed → assigned_vendor → vendor_accepted → in_production
→ qc_pending → ready_for_pickup → delivery_assigned → out_for_delivery → delivered
```
Dead ends: `cancelled`, `refunded`

### Complete Order Flow (Frontend Integration)
```
1. Customer browses products
2. Customer configures (print config / design)
3. Customer adds to cart
4. Customer applies coupon (optional)
5. Customer places order → POST /api/orders
6. Customer creates payment → POST /api/payments/create
7. Customer pays via Razorpay SDK
8. Customer verifies payment → POST /api/payments/verify
   → Order auto-confirmed
9. Admin assigns vendor → PATCH /api/admin/orders/:id/reassign-vendor
10. Vendor accepts → POST /api/vendor/orders/:id/accept
11. Vendor produces → PATCH /api/vendor/orders/:id/start-production
12. Vendor QC → PATCH /api/vendor/orders/:id/qc-pending
13. Vendor ready → PATCH /api/vendor/orders/:id/ready-for-pickup
14. Rider accepts task → POST /api/delivery/tasks/accept
15. Rider picks up → POST /api/delivery/tasks/:id/confirm-pickup
16. Rider delivers → POST /api/delivery/tasks/:id/mark-delivered
17. Customer tracks → GET /api/delivery/track/:orderId
```

### Service URLs (Direct Access)
| Service | URL | Swagger |
|---------|-----|---------|
| Gateway | http://localhost:4000 | http://localhost:4000/api-docs |
| Auth | http://localhost:4001 | http://localhost:4001/api-docs |a
| User | http://localhost:4002 | http://localhost:4002/api-docs |
| Product | http://localhost:4003 | http://localhost:4003/api-docs |
| Design | http://localhost:4004 | http://localhost:4004/api-docs |
| Order | http://localhost:4005 | http://localhost:4005/api-docs |
| Payment | http://localhost:4006 | http://localhost:4006/api-docs |
| Notification | http://localhost:4007 | http://localhost:4007/api-docs |
| Admin | http://localhost:4008 | http://localhost:4008/api-docs |
| Delivery | http://localhost:4009 | http://localhost:4009/api-docs |
| Vendor | http://localhost:4010 | http://localhost:4010/api-docs |
| Finance | http://localhost:4011 | http://localhost:4011/api-docs |
