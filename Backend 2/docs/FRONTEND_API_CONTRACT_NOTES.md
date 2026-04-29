# Frontend API Contract Notes

This note captures the API contracts that recently caused frontend integration errors.

Base gateway:

```txt
https://gateway-202671058278.asia-south1.run.app
```

## Auth rule

- Protected APIs must use `Authorization: Bearer <short_jwt>`
- Do not send Firebase ID tokens to normal backend APIs
- `401 No token provided` means the short backend JWT was not attached

## Wishlist

Routes:

- `GET /api/users/wishlist`
- `POST /api/users/wishlist`
- `DELETE /api/users/wishlist`
- `DELETE /api/users/wishlist/:productId`

Rules:

- These routes are protected
- `GET /api/users/wishlist` should not be called without the short JWT
- `POST /api/users/wishlist` requires JSON body with `productId`
- Optional `productType` values:
  - `gifting`
  - `shopping`
  - `printing`
  - `business-printing`

Example:

```json
{
  "productId": "abc123",
  "productType": "gifting"
}
```

Notes:

- Duplicate wishlist adds now return conflict-style behavior instead of crashing the backend
- If wishlist fails after login, first check whether the frontend is attaching the short JWT

## Wallet

Correct routes:

- `GET /api/wallet`
- `GET /api/wallet/overview`
- `GET /api/wallet/ledger?page=1&limit=10`

Do not use:

- `GET /api/wallet/balance`

Reason:

- `/api/wallet/balance` does not exist in the backend and returns `404`

## Nearby vendor stores

Correct route:

- `GET /api/vendor/stores/nearby?lat=<number>&lng=<number>&radius=<number>&limit=<number>`

Important:

- This endpoint is public
- `lat` is required
- `lng` is required
- Calling only `?limit=50` is invalid frontend usage

Correct example:

```txt
/api/vendor/stores/nearby?lat=23.189257889699917&lng=79.929672&radius=25&limit=50
```

Do not call:

```txt
/api/vendor/stores/nearby?limit=50
```

## Addresses

Correct routes:

- `GET /api/users/addresses`
- `POST /api/users/addresses`
- `PUT /api/users/addresses/:id`

Important:

- If `line2` is blank, omit it from the payload
- Do not send `"line2": ""`

Reason:

- the backend validation rejects empty-string `line2` with `422`

## Delivery partner current task

Route:

- `GET /api/delivery/tasks/current`

Expected behavior:

- `200` when an active task exists
- `404` when there is no current active task

Frontend behavior:

- treat `404` here as an empty state, not as a server outage

## Delivery incidents

Routes:

- `POST /api/delivery/support/incident/uploads`
- `POST /api/delivery/support/incident`

Rules:

- both routes are protected and require the rider token
- incident reporting no longer requires an active current task
- `taskId` is optional
- when a rider has an active task and no `taskId` is sent, backend links the incident automatically

Photo upload:

- upload photos first using multipart field name `photos`
- max 3 files
- allowed formats: JPG, PNG, WEBP
- upload API returns `photoUrls`

Incident payload:

```json
{
  "issueType": "order_trouble",
  "description": "Customer address is unreachable and rider is waiting at gate.",
  "taskId": "optional-task-id",
  "photoUrls": [
    "https://.../uploads/delivery/incidents/file-1.jpg"
  ],
  "location": {
    "lat": 23.1892,
    "lng": 79.9296,
    "heading": 0,
    "speedKmph": 0,
    "capturedAt": "2026-04-27T08:00:00.000Z"
  }
}
```

Review flow:

- delivery incidents are created as real ops tickets
- admin can review them through the existing admin ticket APIs
- riders should not use SOS for normal support incidents

## Status code guidance

- `200`: success
- `304`: cached response, normal
- `400`: invalid request payload or query
- `401`: missing or invalid short JWT
- `404`: route missing or valid empty-state route depending on endpoint
- `422`: validation error

## Quick checklist for frontend

- Attach the short backend JWT to protected APIs
- Use `/api/wallet`, not `/api/wallet/balance`
- Use `/api/vendor/stores/nearby` only with both `lat` and `lng`
- Omit `line2` when it is blank
- Treat `/api/delivery/tasks/current` `404` as "no active task"
