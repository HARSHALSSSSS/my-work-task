# Backend Smoke Test Guide

This guide is for backend-side verification before frontend integration.

Use it to catch:

- missing routes
- wrong request shapes
- missing auth headers
- empty-state responses that frontend should not treat as outages

## Base URLs

Production gateway:

```txt
https://gateway-202671058278.asia-south1.run.app
```

Useful pages:

- Gateway health: `GET /health`
- Gateway Swagger: `GET /api-docs`

## Best way to verify APIs from backend side

Use all three:

1. Gateway Swagger for route discovery
2. Postman collection for grouped manual testing
3. Cloud Run logs for the exact failing service

## Existing repo assets

Swagger:

- [Backend/gateway/src/app.js](/s:/My%20Codes/speedcopy/Backend/gateway/src/app.js:47)
- open in browser:

```txt
https://gateway-202671058278.asia-south1.run.app/api-docs
```

Postman collection:

- [SpeedCopy_Complete.postman_collection.json](/s:/My%20Codes/speedcopy/Backend/docs/SpeedCopy_Complete.postman_collection.json:1)

Health script:

- [health-check.js](/s:/My%20Codes/speedcopy/Backend/scripts/health-check.js:1)

## Recommended smoke-test order

1. Health
2. Public GET APIs
3. Auth exchange
4. Protected customer APIs
5. Delivery auth and delivery protected APIs
6. Vendor/public store lookup
7. Review Cloud Run logs for any non-expected 4xx/5xx

## 1. Health checks

Check gateway:

```powershell
curl https://gateway-202671058278.asia-south1.run.app/health
```

Check individual services when needed:

- `auth`
- `user`
- `product`
- `order`
- `payment`
- `notification`
- `admin`
- `delivery`
- `vendor`
- `finance`

Example:

```powershell
curl https://user-202671058278.asia-south1.run.app/health
```

## 2. Public APIs you should verify first

These should work without login:

- `GET /api/products/categories`
- `GET /api/products/categories?flowType=gifting`
- `GET /api/gifting/products?limit=12`
- `GET /api/shop/home`
- `GET /api/shop/categories`
- `GET /api/shop/products?limit=40`
- `GET /api/vendor/stores/nearby?lat=23.189257889699917&lng=79.929672&radius=25&limit=50`

Important:

- `GET /api/vendor/stores/nearby?limit=50` is invalid
- this route requires both `lat` and `lng`

## 3. Auth exchange

Customer auth flow:

1. get Firebase ID token from client login
2. call `POST /api/auth/verify`
3. save returned short JWT
4. use short JWT on all protected APIs

Header:

```txt
Authorization: Bearer <short_jwt>
```

## 4. Protected customer APIs to verify

After short JWT is available, verify:

- `GET /api/users/profile`
- `GET /api/users/addresses`
- `GET /api/users/wishlist`
- `GET /api/orders/cart`
- `GET /api/orders/my-orders?limit=50&status=processing`
- `GET /api/wallet`
- `GET /api/wallet/ledger?page=1&limit=10`

Wishlist writes:

- `POST /api/users/wishlist`
- `DELETE /api/users/wishlist/:productId`

Important:

- use `/api/wallet`
- do not use `/api/wallet/balance`

Address validation:

- if `line2` is blank, omit it from payload
- do not send `"line2": ""`

## 5. Delivery APIs to verify

Public delivery auth:

- `POST /api/delivery/auth/send-otp`
- `POST /api/delivery/auth/verify-otp`

Protected delivery APIs after rider login:

- `GET /api/delivery/me/profile`
- `GET /api/delivery/me/availability`
- `PATCH /api/delivery/me/availability`
- `GET /api/delivery/tasks/available`
- `GET /api/delivery/tasks/mine?status=delivered&page=1&limit=40`
- `GET /api/delivery/tasks/current`

Important:

- `GET /api/delivery/tasks/current` may return `404` when there is no active task
- treat that as a valid empty state, not a backend outage

## 6. What status codes are acceptable

Expected:

- `200`: success
- `201`: created
- `204`: no content
- `304`: cached response, normal
- `401`: expected if protected API is called without short JWT
- `404`: expected for valid empty-state routes like current delivery task
- `409`: expected on duplicate wishlist add
- `422`: validation error for bad payloads

Needs investigation:

- Google Frontend HTML `400`
- `500`
- `404` on routes that are documented and should exist

## 7. How to read logs correctly

Gateway:

```powershell
gcloud beta run services logs read gateway --region asia-south1 --limit 50
```

Examples for downstream services:

```powershell
gcloud beta run services logs read user --region asia-south1 --limit 50
gcloud beta run services logs read delivery --region asia-south1 --limit 50
gcloud beta run services logs read vendor --region asia-south1 --limit 50
gcloud beta run services logs read finance --region asia-south1 --limit 50
```

Important:

- use actual Cloud Run service names like `delivery`, not `delivery-service`

## 8. Recommended backend signoff checklist

Before frontend integration signoff, confirm:

- gateway `/health` is OK
- gateway `/api-docs` loads
- public catalog APIs return success
- nearby stores works with `lat` and `lng`
- `/api/auth/verify` returns short JWT
- protected customer APIs work with short JWT
- delivery OTP flow works
- delivery availability works
- delivery task list works
- wishlist read works
- wishlist add/remove works
- wallet routes use `/api/wallet`, not `/api/wallet/balance`

## 9. Frontend mismatch notes

See:

- [FRONTEND_API_CONTRACT_NOTES.md](/s:/My%20Codes/speedcopy/Backend/docs/FRONTEND_API_CONTRACT_NOTES.md:1)

This already documents:

- wishlist auth requirement
- wallet route contract
- nearby stores required query params
- address `line2` validation rule
- delivery current-task empty-state behavior
