# SpeedCopy Frontend Integration Guide

This document is for frontend implementation only. It describes the backend behavior that is already available and the role-based API flows the frontend can consume.

Base API gateway:

```txt
http://localhost:4000
```

Auth:

- Protected APIs use `Authorization: Bearer <token>`
- Firebase ID tokens are used only once with `POST /api/auth/verify`
- After `/api/auth/verify`, all normal APIs must use the short backend JWT
- Internal-only APIs are not for frontend use
- Main roles currently supported in backend:
  - `user`
  - `vendor`
  - `admin`
  - `staff`
  - `delivery_partner`

General rules:

- Customer-facing responses are sanitized to avoid vendor leakage
- Delivery partner responses mask customer/vendor contact where required
- Staff and admin flows are scope-based and intended for internal panels
- Frontend auth handoff details are documented in [SHORT_JWT_AUTH_FRONTEND_GUIDE.md](/s:/My%20Codes/speedcopy/Backend/docs/SHORT_JWT_AUTH_FRONTEND_GUIDE.md:1)
- Recent endpoint gotchas and exact frontend contracts are documented in [FRONTEND_API_CONTRACT_NOTES.md](/s:/My%20Codes/speedcopy/Backend/docs/FRONTEND_API_CONTRACT_NOTES.md:1)
- Backend-side verification steps are documented in [BACKEND_SMOKE_TEST_GUIDE.md](/s:/My%20Codes/speedcopy/Backend/docs/BACKEND_SMOKE_TEST_GUIDE.md:1)
- Postman reference is available in [SpeedCopy.postman_collection.json](/s:/My%20Codes/Srajal/SpeedCopy/Backend/docs/SpeedCopy.postman_collection.json:1)

## Customer App

### Profile and privacy

- `GET /api/users/profile`
- `PUT /api/users/profile`
- `GET /api/users/addresses`
- `POST /api/users/addresses`
- `PUT /api/users/addresses/:id`
- `DELETE /api/users/addresses/:id`
- `PATCH /api/users/profile/notifications`
- `POST /api/users/profile/data-export-request`
- `POST /api/users/profile/account-deletion-request`

Important behavior:

- notification preferences support `push`, `whatsapp`, `criticalAlerts`, `quietHours`
- `criticalAlerts` cannot be disabled by the user
- account deletion is blocked if the user has active orders

Suggested notification payload:

```json
{
  "push": true,
  "whatsapp": true,
  "quietHours": {
    "start": "22:00",
    "end": "07:00"
  }
}
```

### Catalog and designs

- `GET /api/products/categories`
- `GET /api/products`
- `GET /api/products/:id`
- `GET /api/designs/templates`
- `GET /api/designs/templates/premium`
- `POST /api/designs/blank`
- `POST /api/designs/from-template`
- `POST /api/designs`
- `GET /api/designs`
- `GET /api/designs/:id`
- `PUT /api/designs/:id`
- `PATCH /api/designs/:id/approve`

Important behavior:

- saved designs and approved designs are supported for reorder/reuse flows
- premium templates are already exposed from backend

### Cart and orders

- `GET /api/orders/cart`
- `POST /api/orders/cart`
- `PATCH /api/orders/cart/:id`
- `DELETE /api/orders/cart/:id`
- `DELETE /api/orders/cart/clear`
- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders/:id`
- `GET /api/orders/summary`
- `GET /api/orders/:id/track`
- `GET /api/orders/:id/edit-window`
- `PATCH /api/orders/:id/before-production`
- `POST /api/orders/:id/clarification/respond`
- `POST /api/orders/:id/reorder`

Important behavior:

- `GET /api/orders/:id` is customer-safe and does not expose internal vendor details
- edit window is available only before production starts
- clarification responses are supported from customer side
- reorder is supported for previous orders

Suggested clarification response payload:

```json
{
  "response": "Please continue with matte finish."
}
```

Suggested before-production update payload:

```json
{
  "notes": "Please update delivery note"
}
```

### Payments, wallet, referrals, tickets

- `POST /api/payments/create`
- `POST /api/payments/verify`
- `GET /api/wallet`
- `GET /api/wallet/overview`
- `GET /api/wallet/ledger`
- `GET /api/referrals`
- `GET /api/referrals/summary`
- `POST /api/referrals/apply`
- `GET /api/notifications`
- `GET /api/notifications/summary`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`
- `POST /api/notifications/tickets`
- `GET /api/notifications/tickets`
- `GET /api/notifications/tickets/:id`
- `POST /api/notifications/tickets/:id/reply`
- `GET /api/notifications/help-center`

### Delivery tracking

- `GET /api/delivery/track/:orderId`

Important behavior:

- customer-facing delivery tracking is approximate
- partner identity and branding are intentionally hidden

## Vendor Panel

### Org and stores

- `GET /api/vendor/org/profile`
- `PUT /api/vendor/org/profile`
- `GET /api/vendor/stores`
- `POST /api/vendor/stores`
- `GET /api/vendor/stores/:id`
- `PUT /api/vendor/stores/:id`
- `PATCH /api/vendor/stores/:id/status`
- `PUT /api/vendor/stores/:id/capacity`
- `PATCH /api/vendor/stores/:id/availability`

Important behavior:

- org profile supports agreement/compliance-related backend fields
- store capacity and availability support internal routing fields
- store location is not meant for customer exposure

### Vendor staff and finance

- `GET /api/vendor/staff`
- `POST /api/vendor/staff`
- `PUT /api/vendor/staff/:id`
- `PATCH /api/vendor/staff/:id/assign-stores`
- `PATCH /api/vendor/staff/:id/status`
- `GET /api/vendor/analytics/performance`
- `GET /api/vendor/finance/summary`
- `GET /api/vendor/finance/payout-history`

Important behavior:

- vendor staff can be multi-store
- staff record supports permissions and scoped access
- finance views are read-focused from vendor side

## Admin Panel

### Dashboard and governance

- `GET /api/admin/dashboard`
- `GET /api/admin/reports/*`
- `GET /api/admin/control/state`
- `PATCH /api/admin/control/vendor-intake`
- `PATCH /api/admin/control/kill-switch`

### Order oversight

- `GET /api/admin/orders`
- `GET /api/admin/orders/:id`
- `PATCH /api/admin/orders/:id/reassign`
- `PATCH /api/admin/orders/:id/cancel`
- `POST /api/admin/refunds/:orderId`

Important behavior:

- reassignment writes assignment history
- admin cancel/refund flows also update customer-facing status
- audit logging is persistent

### Vendor, customer, staff, finance

- `GET /api/admin/vendors`
- `GET /api/admin/vendors/:id`
- `PATCH /api/admin/vendors/:id/suspend`
- `PATCH /api/admin/vendors/:id/resume`
- `PATCH /api/admin/vendors/:id/priority`
- `GET /api/admin/customers`
- `GET /api/admin/customers/:id`
- `PATCH /api/admin/customers/:id/restrict`
- `GET /api/admin/staff`
- `POST /api/admin/staff`
- `PATCH /api/admin/staff/:id`
- `GET /api/admin/finance/summary`

Important behavior:

- admin customer detail can include orders, wallet, and profile aggregates
- admin staff supports `team`, `permissions`, and `scopes`

## Staff Panel

Staff uses internal flows backed by role/scope checks.

### Staff operational APIs

- `GET /api/orders/:id`
- `POST /api/orders/:id/clarification/request`
- `GET /api/notifications/tickets`
- `GET /api/notifications/tickets/:id`
- `POST /api/notifications/tickets/:id/reply`
- `PATCH /api/notifications/tickets/:id/assign`
- `PATCH /api/notifications/tickets/:id/status`
- `POST /api/notifications/tickets/:id/escalate`

Important behavior:

- staff can request clarification on orders
- staff cannot override admin-only controls
- ticket assignment/escalation generates internal notifications

## Delivery Partner App

### Rider onboarding and availability

- `GET /api/delivery/me/availability`
- `PATCH /api/delivery/me/availability`
- `POST /api/delivery/me/identity-verification`
- `GET /api/delivery/earnings/summary`

Important behavior:

- partner must be available and KYC-approved before accepting tasks

Suggested availability payload:

```json
{
  "isAvailable": true
}
```

### Delivery job flow

- `GET /api/delivery/tasks/available`
- `GET /api/delivery/tasks/current`
- `GET /api/delivery/tasks/mine`
- `GET /api/delivery/tasks/:taskId`
- `POST /api/delivery/tasks/accept`
- `POST /api/delivery/tasks/:taskId/accept`
- `POST /api/delivery/tasks/:taskId/reject`
- `POST /api/delivery/tasks/:taskId/arrived-pickup`
- `POST /api/delivery/tasks/:taskId/confirm-pickup`
- `POST /api/delivery/tasks/:taskId/location`
- `POST /api/delivery/tasks/:taskId/mark-delivered`
- `POST /api/delivery/tasks/:taskId/proof`
- `POST /api/delivery/tasks/:taskId/failure`
- `POST /api/delivery/tasks/:taskId/sos`

Important behavior:

- task payloads intentionally mask direct customer/vendor contact
- delivery proof and failure capture are supported
- failure flow also emits customer notification internally

Suggested proof payload:

```json
{
  "otp": "1234",
  "photoUrl": "https://example.com/proof.jpg",
  "notes": "Delivered to gate"
}
```

Suggested failure payload:

```json
{
  "reason": "customer_unreachable",
  "note": "No response after multiple attempts"
}
```

## Notifications and tickets

Shared ticket endpoints used across customer/admin/staff flows:

- `POST /api/notifications/tickets`
- `GET /api/notifications/tickets`
- `GET /api/notifications/tickets/:id`
- `POST /api/notifications/tickets/:id/reply`
- `PATCH /api/notifications/tickets/:id/assign`
- `PATCH /api/notifications/tickets/:id/status`
- `POST /api/notifications/tickets/:id/escalate`

Important behavior:

- customers see their own tickets
- admin/staff can manage broader ticket queues
- assignment and escalation create internal notifications

## Frontend implementation notes

- Build all apps against gateway routes, not direct microservice ports
- Prefer role-based route guards on frontend, but backend remains source of truth
- Do not assume vendor or delivery identity fields are available in customer flows
- Handle `403` and `409` cleanly for blocked actions like scoped access or edit-window restrictions
- For customer account deletion, show a blocked state if backend returns `accountDeletionStatus: blocked_active_orders`

## Minimal frontend starter sequence

Customer app:

1. login
2. fetch profile
3. fetch categories/products
4. build cart/order flow
5. add notifications/tickets
6. add order tracking/edit window/clarification response

Vendor panel:

1. org profile
2. stores
3. store capacity/availability
4. staff
5. analytics and finance summary

Admin/staff:

1. dashboard
2. orders
3. tickets
4. vendor/customer/staff management
5. controls and reports

Delivery app:

1. availability
2. identity verification
3. task queue
4. pickup/transit/delivery proof
5. earnings
