# SpeedCopy Backend API Audit

## 1. Backend Shape

This backend is a microservices setup behind a single API gateway.

- Gateway: `Backend/gateway`
- Shared libs/middlewares/utils: `Backend/shared`
- Services:
  - `auth-service`
  - `user-service`
  - `product-service`
  - `design-service`
  - `order-service`
  - `payment-service`
  - `notification-service`
  - `admin-service`
  - `delivery-service`
  - `vendor-service`
  - `finance-service`

## 2. API Counts

These counts are based on concrete Express route handlers found in route files.

- Explicit gateway route handlers: `13`
- Service route handlers: `341`
- Total concrete route handlers found: `354`

Important note:

- The gateway also exposes many proxied endpoints that are not declared one-by-one in gateway files.
- Because of that, the real client-facing surface is mostly:
  - explicit gateway handlers
  - plus proxied service endpoints mounted under gateway prefixes

## 3. Ports and Base URLs

From `Backend/gateway/src/config/index.js`:

- Gateway: `http://localhost:4000`
- Auth service: `http://localhost:4001`
- User service: `http://localhost:4002`
- Product service: `http://localhost:4003`
- Design service: `http://localhost:4004`
- Order service: `http://localhost:4005`
- Payment service: `http://localhost:4006`
- Notification service: `http://localhost:4007`
- Admin service: `http://localhost:4008`
- Delivery service: `http://localhost:4009`
- Vendor service: `http://localhost:4010`
- Finance service: `http://localhost:4011`

## 4. How Request Flow Works

### 4.1 Normal client flow

1. Client calls gateway at `/api/...`
2. Gateway verifies JWT when the route is protected
3. Gateway injects headers like:
   - `x-user-id`
   - `x-user-role`
   - `x-user-email`
   - `x-user-permissions`
4. Gateway either:
   - proxies the request to the target service, or
   - aggregates multiple services in `app.service.js`
5. Service handles business logic and returns JSON

### 4.2 Internal service-to-service flow

Some services call other services directly using HTTP plus `x-internal-token`.

Examples:

- `order-service` -> `product-service` to resolve cart/order items
- `order-service` -> `user-service` to fetch address data
- `order-service` -> `delivery-service` to create delivery tasks
- `order-service` -> `notification-service` to emit notifications
- `delivery-service` -> `order-service` to update delivery status
- `delivery-service` -> `notification-service` to notify users
- `delivery-service` -> `finance-service` for earnings summary
- `finance-service` -> `notification-service` on refund events
- `payment-service` -> `order-service` after payment verification

## 5. Gateway Route Map

Gateway mount points from `Backend/gateway/src/app.js`:

- `/api/auth` -> auth gateway/proxy
- `/api/app` -> aggregated app endpoints
- `/api/users` -> user-service proxy
- `/api/products` -> product-service proxy
- `/api/printing` -> product-service printing proxy
- `/api/business-printing` -> product-service business-printing proxy
- `/api/shop` -> product-service + order-service split flow
- `/api/gifting` -> product-service + order-service split flow
- `/api/cart` -> order-service public cart proxy
- `/api/designs` -> design-service proxy
- `/api/orders` -> order-service proxy
- `/api/payments` -> payment-service proxy
- `/api/notifications` -> notification-service proxy
- `/api/admin` -> admin product routes + admin-service routes
- `/api/tickets` -> notification-service ticket proxy
- `/api/staff` -> admin-service staff routes
- `/api/delivery` -> delivery-service proxy
- `/api/vendor` -> vendor-service and vendor-order proxy
- `/api` -> finance-service proxy for wallet/referrals/admin finance

Upload proxy mounts:

- `/uploads/users` -> user-service static uploads
- `/uploads/vendors` -> vendor-service static uploads
- `/uploads/admin` -> admin-service static uploads
- `/uploads` -> product-service static uploads

## 6. Gateway-Only Explicit APIs

These are not plain pass-through route declarations.

### 6.1 Auth gateway

- `POST /api/auth/verify`
- `GET /api/auth/me`
- `PATCH /api/auth/users/:id/role`
- `PATCH /api/auth/users/:id/status`

Behavior:

- Mostly forwards to auth-service.
- `/verify` is rate-limited.
- `/me`, role update, and status update require JWT.

### 6.2 App aggregation APIs

- `GET /api/app/home`
- `GET /api/app/sidebar`
- `GET /api/app/account/profile`
- `GET /api/app/account/addresses`
- `GET /api/app/wallet`
- `GET /api/app/referrals`
- `GET /api/app/orders`
- `GET /api/app/notifications`
- `GET /api/app/support`

Behavior:

- These call multiple services and return frontend-friendly combined payloads.
- `GET /api/app/home` pulls product home data from:
  - `/api/shop/home`
  - `/api/gifting/home`
  - `/api/printing/home`
  - `/api/business-printing/home`
- `GET /api/app/sidebar` combines:
  - auth profile
  - user profile
  - wallet overview
  - referral summary
  - order summary
  - addresses
  - notification summary

## 7. Service-by-Service Endpoint Inventory

## 7.1 Auth Service

Base path: `/api/auth`

Purpose:

- user registration/login
- Firebase token verification
- Google login
- phone OTP login
- role and status management

Endpoints:

- `POST /api/auth/register` -> register user with email/password
- `POST /api/auth/google-verify` -> verify Google login
- `POST /api/auth/phone/send-otp` -> send OTP to phone
- `POST /api/auth/phone/verify-otp` -> verify OTP and log in
- `POST /api/auth/admin/register` -> create admin/staff style auth record
- `POST /api/auth/login` -> email/password login
- `POST /api/auth/verify` -> verify Firebase token and return user
- `GET /api/auth/me` -> current authenticated user
- `PATCH /api/auth/users/:id/role` -> update role
- `PATCH /api/auth/users/:id/status` -> activate/deactivate user

## 7.2 User Service

Base path: `/api/users`

Purpose:

- customer profile
- avatar upload
- profile preferences
- data export and deletion requests
- address book

Endpoints:

- `GET /api/users/profile` -> get profile
- `PUT /api/users/profile` -> update profile
- `POST /api/users/profile/avatar` -> upload avatar
- `PATCH /api/users/profile/notifications` -> update notification preferences
- `POST /api/users/profile/data-export-request` -> request account data export
- `POST /api/users/profile/account-deletion-request` -> request account deletion
- `GET /api/users/addresses` -> list addresses
- `POST /api/users/addresses` -> add address
- `PUT /api/users/addresses/:id` -> update address
- `DELETE /api/users/addresses/:id` -> delete address

## 7.3 Product Service

This service powers catalog/browse/configure flows.

### Categories

Base path: `/api/products/categories`

- `GET /api/products/categories` -> list categories
- `GET /api/products/categories/:slug` -> category by slug
- `GET /api/products/categories/:id/subcategories` -> subcategories
- `POST /api/products/categories` -> create category
- `PUT /api/products/categories/:id` -> update category
- `POST /api/products/categories/subcategories` -> create subcategory
- `PUT /api/products/categories/subcategories/:id` -> update subcategory

### Generic products

Base path: `/api/products`

- `GET /api/products` -> list products
- `GET /api/products/:id` -> product by id
- `GET /api/products/slug/:slug` -> product by slug
- `POST /api/products` -> create product
- `PUT /api/products/:id` -> update product
- `DELETE /api/products/:id` -> delete product

### Printing

Base path: `/api/printing`

- `GET /api/printing/home` -> printing landing/home data
- `GET /api/printing/document-types` -> supported document types
- `GET /api/printing/document-types/:type` -> document type detail
- `GET /api/printing/service-packages` -> print service packages
- `GET /api/printing/pickup-locations` -> pickup locations
- `POST /api/printing/upload` -> upload print files
- `POST /api/printing/configure` -> save print configuration
- `GET /api/printing/config/:id` -> fetch saved print config

### Business printing

Base path: `/api/business-printing`

- `GET /api/business-printing/home` -> business printing home data
- `GET /api/business-printing/types` -> business print types
- `GET /api/business-printing/products` -> list business print products
- `GET /api/business-printing/products/:id` -> product detail
- `GET /api/business-printing/service-packages` -> packages
- `GET /api/business-printing/pickup-locations` -> pickup points
- `POST /api/business-printing/configure` -> save config
- `GET /api/business-printing/config/:id` -> get config

### Gifting catalog

Base path: `/api/gifting`

- `GET /api/gifting/home` -> gifting home
- `GET /api/gifting/categories` -> gifting categories
- `GET /api/gifting/products` -> gifting product list
- `GET /api/gifting/search` -> gifting search
- `GET /api/gifting/products/:identifier` -> gifting product detail

### Shopping catalog

Base path: `/api/shop`

- `GET /api/shop/home` -> shop home
- `GET /api/shop/categories` -> shopping categories
- `GET /api/shop/products` -> product list
- `GET /api/shop/products/:slug` -> product detail
- `GET /api/shop/deals` -> deals
- `GET /api/shop/trending` -> trending products
- `GET /api/shop/search` -> search products

### Admin shopping catalog

Base path: `/api/admin/shop`

- `POST /api/admin/shop/products` -> create shopping product
- `PUT /api/admin/shop/products/:id` -> update shopping product
- `DELETE /api/admin/shop/products/:id` -> delete shopping product
- `PATCH /api/admin/shop/products/:id/deal` -> toggle/update deal
- `POST /api/admin/shop/categories` -> create shopping category
- `PUT /api/admin/shop/categories/:id` -> update shopping category

### Admin gifting catalog

Base path: `/api/admin/gifting`

- `POST /api/admin/gifting/products` -> create gifting product
- `PUT /api/admin/gifting/products/:id` -> update gifting product
- `DELETE /api/admin/gifting/products/:id` -> delete gifting product
- `POST /api/admin/gifting/categories` -> create gifting category
- `PUT /api/admin/gifting/categories/:id` -> update gifting category

### Admin banners

Base path: `/api/admin/banners`

- `POST /api/admin/banners` -> create banner
- `PUT /api/admin/banners/:id` -> update banner
- `DELETE /api/admin/banners/:id` -> delete banner

### Internal catalog resolution

Used by order-service.

- `POST /api/internal/shop/items/resolve`
- `POST /api/internal/gifting/items/resolve`

Purpose:

- validate product ids
- calculate stock-aware prices
- return normalized product snapshots for cart/order creation

## 7.4 Design Service

Base path: `/api/designs`

Purpose:

- template browsing
- blank canvas creation
- design save/update/fetch
- template-to-design creation
- approval/finalization hooks

Endpoints:

- `GET /api/designs/templates/premium` -> premium templates
- `GET /api/designs/templates` -> all templates
- `POST /api/designs/blank` -> create blank design
- `POST /api/designs/from-template` -> create design from template
- `POST /api/designs` -> save design
- `GET /api/designs` -> list user designs
- `PATCH /api/designs/:id/approve` -> mark design approved/finalized
- `GET /api/designs/:id` -> get one design
- `PUT /api/designs/:id` -> update design

## 7.5 Order Service

This service handles:

- public cart
- authenticated cart
- shopping order creation
- gifting order creation
- general order tracking and lifecycle
- vendor-side order operations

### Public cart

Base path: `/api/cart`

- `GET /api/cart` -> get public/simple cart
- `POST /api/cart/add` -> add item
- `DELETE /api/cart/:itemId` -> remove item

### Authenticated order cart

Base path: `/api/orders/cart`

- `GET /api/orders/cart` -> get order cart
- `POST /api/orders/cart` -> add to cart
- `PATCH /api/orders/cart/:itemId` -> update quantity/item
- `DELETE /api/orders/cart/:itemId` -> remove item
- `DELETE /api/orders/cart/clear` -> clear cart
- `POST /api/orders/cart/apply-coupon` -> apply coupon

### Shopping checkout

Base path: `/api/shop`

- `POST /api/shop/orders` -> create shopping order

### Gifting cart

Base path: `/api/gifting/cart`

- `GET /api/gifting/cart` -> get gifting cart
- `POST /api/gifting/cart/add` -> add gifting item
- `DELETE /api/gifting/cart/:itemId` -> remove gifting item

### Gifting checkout

Base path: `/api/gifting`

- `POST /api/gifting/orders` -> create gifting order

### Orders

Base path: `/api/orders`

- `POST /api/orders` -> create order
- `GET /api/orders/summary` -> my order summary
- `GET /api/orders` -> my orders
- `GET /api/orders/:id` -> order detail
- `GET /api/orders/:id/edit-window` -> edit lock window
- `PATCH /api/orders/:id/before-production` -> customer edits before production
- `POST /api/orders/:id/clarification/respond` -> customer answers clarification
- `POST /api/orders/:id/clarification/request` -> staff/admin asks clarification
- `PATCH /api/orders/:id/status` -> admin changes order status
- `PATCH /api/orders/:id/delivery-status` -> internal delivery/payment status update
- `GET /api/orders/:id/track` -> tracking view
- `POST /api/orders/:id/reorder` -> reorder existing order

### Vendor order board

Base path: `/api/vendor/orders`

- `GET /api/vendor/orders/queue` -> vendor queue
- `GET /api/vendor/orders/score` -> vendor score/metrics
- `GET /api/vendor/orders/closure` -> vendor closure summary
- `GET /api/vendor/orders/assigned` -> assigned orders
- `GET /api/vendor/orders/:id` -> vendor order detail
- `POST /api/vendor/orders/:id/accept` -> accept order
- `POST /api/vendor/orders/:id/reject` -> reject order
- `PATCH /api/vendor/orders/:id/start-production` -> move to production
- `PATCH /api/vendor/orders/:id/qc-pending` -> move to QC
- `PATCH /api/vendor/orders/:id/ready-for-pickup` -> mark ready
- `POST /api/vendor/orders/:id/status` -> generic status update
- `POST /api/vendor/orders/:id/qc-upload` -> QC upload
- `POST /api/vendor/orders/:id/ready` -> ready alias

## 7.6 Payment Service

Base path: `/api/payments`

Purpose:

- create Razorpay payment intent/order
- verify payment
- notify order-service after success

Endpoints:

- `POST /api/payments/create` -> create payment
- `POST /api/payments/verify` -> verify payment and mark paid

Flow detail:

- In mock mode it works without real Razorpay credentials.
- After verification it calls order-service to update order state.

## 7.7 Notification Service

Base path: `/api/notifications`

Purpose:

- user notifications
- notification summary and read-state
- support tickets
- help center data
- websocket-driven ticket/notification events

Endpoints:

- `GET /api/notifications` -> list notifications
- `GET /api/notifications/summary` -> notification summary
- `PATCH /api/notifications/read-all` -> mark all read
- `PATCH /api/notifications/:id/read` -> mark one read
- `POST /api/notifications/internal` -> internal-only create notification
- `POST /api/notifications/tickets` -> create support ticket
- `GET /api/notifications/tickets` -> list tickets
- `GET /api/notifications/tickets/summary` -> ticket summary
- `GET /api/notifications/help-center` -> help center data
- `GET /api/notifications/tickets/:id` -> ticket detail
- `PATCH /api/notifications/tickets/:id/assign` -> assign ticket
- `PATCH /api/notifications/tickets/:id/status` -> update status
- `POST /api/notifications/tickets/:id/escalate` -> escalate
- `POST /api/notifications/tickets/:id/reply` -> reply

## 7.8 Admin Service

### Admin routes

Base path: `/api/admin`

Purpose:

- dashboard/ops control
- orders, vendors, customers, staff
- SLA and reporting
- ticket operations
- delivery partner administration
- coupons

Endpoints:

- `GET /api/admin/dashboard`
- `GET /api/admin/orders`
- `GET /api/admin/orders/:id`
- `PATCH /api/admin/orders/:id/reassign-vendor`
- `PATCH /api/admin/orders/:id/cancel`
- `PATCH /api/admin/orders/:id/refund`
- `GET /api/admin/vendors`
- `GET /api/admin/vendors/:id`
- `PATCH /api/admin/vendors/:id/suspend`
- `PATCH /api/admin/vendors/:id/priority`
- `GET /api/admin/customers`
- `GET /api/admin/customers/:id`
- `PATCH /api/admin/customers/:id/restrict`
- `GET /api/admin/staff`
- `POST /api/admin/staff`
- `PATCH /api/admin/staff/:id/role`
- `GET /api/admin/control`
- `PATCH /api/admin/control/order-intake`
- `PATCH /api/admin/control/vendor-intake`
- `PATCH /api/admin/control/kill-switch`
- `PATCH /api/admin/control/city-pause`
- `PATCH /api/admin/control/feature-flags`
- `GET /api/admin/reports`
- `GET /api/admin/audit-logs`
- `GET /api/admin/sla/risks`
- `GET /api/admin/sla/policies`
- `POST /api/admin/sla/policies`
- `GET /api/admin/sla/metrics`
- `GET /api/admin/sla/breaches`
- `POST /api/admin/sla/:orderId/escalate`
- `POST /api/admin/sla/:orderId/compensate`
- `GET /api/admin/tickets`
- `GET /api/admin/tickets/stats`
- `GET /api/admin/tickets/agents/performance`
- `GET /api/admin/tickets/:ticketId`
- `PATCH /api/admin/tickets/:ticketId/assign`
- `PATCH /api/admin/tickets/:ticketId/escalate`
- `PATCH /api/admin/tickets/:ticketId/resolve`
- `POST /api/admin/tickets/:ticketId/messages`
- `POST /api/admin/tickets/uploads/attachments`
- `GET /api/admin/delivery/partners`
- `POST /api/admin/delivery/partners`
- `GET /api/admin/delivery/sla-metrics`
- `GET /api/admin/delivery/partners/:partnerId`
- `PUT /api/admin/delivery/partners/:partnerId`
- `DELETE /api/admin/delivery/partners/:partnerId`
- `PATCH /api/admin/delivery/partners/:partnerId/suspend`
- `PATCH /api/admin/delivery/partners/:partnerId/resume`
- `POST /api/admin/delivery/partners/:partnerId/zones`
- `PATCH /api/admin/delivery/partners/:partnerId/payout-rate`
- `GET /api/admin/delivery/partners/:partnerId/analytics`
- `GET /api/admin/coupons`
- `POST /api/admin/coupons`
- `PUT /api/admin/coupons/:id`
- `DELETE /api/admin/coupons/:id`
- `GET /api/admin/coupons/:id/usage`

### Staff routes

Base path: `/api/staff`

Purpose:

- staff authentication and session management
- task queues
- operational order handling
- ticket ops
- refunds, wallet actions, payouts
- campaigns, targeting, analytics, escalations

Endpoints:

- `POST /api/staff/auth/login`
- `POST /api/staff/auth/mfa/verify`
- `POST /api/staff/auth/logout`
- `GET /api/staff/auth/session`
- `GET /api/staff/auth/sessions`
- `DELETE /api/staff/auth/session/:id`
- `GET /api/staff/roles/:userId`
- `GET /api/staff/permissions/:role`
- `POST /api/staff/roles/assign`
- `GET /api/staff/tasks`
- `GET /api/staff/tasks/:id`
- `POST /api/staff/tasks/:id/complete`
- `POST /api/staff/tasks/:id/assign`
- `GET /api/staff/orders`
- `GET /api/staff/orders/:id`
- `POST /api/staff/orders/:id/reassign-vendor`
- `POST /api/staff/orders/:id/clarification`
- `GET /api/staff/tickets`
- `GET /api/staff/tickets/:id`
- `POST /api/staff/tickets/:id/reply`
- `POST /api/staff/tickets/:id/close`
- `POST /api/staff/tickets/:id/escalate`
- `GET /api/staff/vendor-tickets`
- `POST /api/staff/vendor-tickets/:id/reply`
- `POST /api/staff/uploads/attachments`
- `GET /api/staff/refunds`
- `POST /api/staff/refunds/:id/approve`
- `POST /api/staff/refunds/:id/escalate`
- `POST /api/staff/wallet/credit`
- `POST /api/staff/wallet/debit`
- `GET /api/staff/wallet/ledger`
- `GET /api/staff/payouts`
- `POST /api/staff/payouts/issue-ticket`
- `GET /api/staff/campaigns`
- `POST /api/staff/coupons`
- `POST /api/staff/targeting`
- `GET /api/staff/analytics/reports`
- `POST /api/staff/escalation`
- `GET /api/staff/escalations`
- `GET /api/staff/audit/logs`
- `GET /api/staff/activity`
- `GET /api/staff/performance`
- `GET /api/staff/system/status`
- `GET /api/staff/permissions/check`
- `POST /api/staff/conflict/lock`

## 7.9 Delivery Service

Base path: `/api/delivery`

Purpose:

- delivery partner login via OTP
- rider profile and availability
- delivery task lifecycle
- live tracking/location
- incidents and SOS
- delivery proof/failure handling
- internal task creation from order-service

Endpoints:

- `POST /api/delivery/internal/tasks` -> create task internally
- `POST /api/delivery/auth/send-otp` -> send rider OTP
- `POST /api/delivery/auth/verify-otp` -> verify rider OTP
- `GET /api/delivery/me/profile` -> rider profile
- `PATCH /api/delivery/me/profile` -> update rider profile
- `POST /api/delivery/support/incident` -> support incident
- `GET /api/delivery/track/:orderId` -> public delivery tracking
- `GET /api/delivery/tasks/available` -> available tasks
- `GET /api/delivery/tasks/current` -> current active task
- `GET /api/delivery/tasks/mine` -> rider task history/list
- `GET /api/delivery/me/availability` -> get availability
- `PATCH /api/delivery/me/availability` -> update availability
- `POST /api/delivery/me/identity-verification` -> submit KYC/identity
- `GET /api/delivery/earnings/summary` -> earnings summary
- `POST /api/delivery/tasks/accept` -> accept task by body payload
- `POST /api/delivery/tasks/:taskId/accept` -> accept task by path
- `POST /api/delivery/tasks/:taskId/reject` -> reject task
- `GET /api/delivery/tasks/:taskId` -> task detail
- `POST /api/delivery/tasks/:taskId/arrived-pickup` -> arrived at pickup
- `POST /api/delivery/tasks/:taskId/confirm-pickup` -> confirm pickup
- `POST /api/delivery/tasks/:taskId/location` -> live location update
- `POST /api/delivery/tasks/:taskId/mark-delivered` -> mark delivered
- `POST /api/delivery/tasks/:taskId/proof` -> submit proof
- `POST /api/delivery/tasks/:taskId/failure` -> mark failure
- `POST /api/delivery/tasks/:taskId/sos` -> SOS

## 7.10 Vendor Service

Base path: `/api/vendor`

Purpose:

- vendor auth
- org profile and legal docs
- store management
- staff management
- vendor-side order handling
- analytics, wallet, closure, payout views
- support tickets

Important note:

- Some endpoints are aliases exposing the same handler under multiple paths.

Endpoints:

- `GET /api/vendor/stores/nearby`
- `POST /api/vendor/auth/login`
- `POST /api/vendor/auth/mfa/verify`
- `POST /api/vendor/auth/logout`
- `GET /api/vendor/auth/session`
- `GET /api/vendor/org/profile`
- `PUT /api/vendor/org/profile`
- `GET /api/vendor/org/legal`
- `POST /api/vendor/org/legal`
- `GET /api/vendor/org/agreement`
- `GET /api/vendor/stores`
- `POST /api/vendor/stores`
- `GET /api/vendor/stores/:id`
- `PUT /api/vendor/stores/:id`
- `PATCH /api/vendor/stores/:id/status`
- `PUT /api/vendor/stores/:id/capacity`
- `PATCH /api/vendor/stores/:id/availability`
- `GET /api/vendor/stores/:id/capabilities`
- `GET /api/vendor/staff`
- `POST /api/vendor/staff`
- `PUT /api/vendor/staff/:id`
- `PATCH /api/vendor/staff/:id/assign-stores`
- `PATCH /api/vendor/staff/:id/status`
- `GET /api/vendor/orders/assigned`
- `GET /api/vendor/orders/:order_id`
- `POST /api/vendor/orders/:order_id/accept`
- `POST /api/vendor/orders/:order_id/reject`
- `POST /api/vendor/orders/:order_id/status`
- `POST /api/vendor/orders/:order_id/qc-upload`
- `POST /api/vendor/orders/:order_id/ready`
- `GET /api/vendor/analytics/performance`
- `GET /api/vendor/finance/wallet/summary`
- `GET /api/vendor/wallet/summary`
- `GET /api/vendor/finance/wallet/store-wise`
- `GET /api/vendor/wallet/store-wise`
- `GET /api/vendor/finance/wallet/deductions`
- `GET /api/vendor/wallet/deductions`
- `GET /api/vendor/finance/closure/daily`
- `GET /api/vendor/closure/daily`
- `GET /api/vendor/finance/closure/weekly`
- `GET /api/vendor/closure/weekly`
- `GET /api/vendor/finance/closure/monthly`
- `GET /api/vendor/closure/monthly`
- `GET /api/vendor/finance/payouts/schedule`
- `GET /api/vendor/payouts/schedule`
- `GET /api/vendor/finance/payouts/history`
- `GET /api/vendor/payouts/history`
- `GET /api/vendor/scoring/rejections/history`
- `GET /api/vendor/rejections/history`
- `GET /api/vendor/scoring/performance-score`
- `GET /api/vendor/vendor/performance-score`
- `GET /api/vendor/performance-score`
- `GET /api/vendor/support/tickets`
- `POST /api/vendor/support/tickets`
- `GET /api/vendor/tickets`
- `POST /api/vendor/tickets`
- `GET /api/vendor/support/tickets/:ticket_id`
- `GET /api/vendor/tickets/:ticket_id`
- `GET /api/vendor/vendor-org/legal`
- `POST /api/vendor/vendor-org/legal`
- `GET /api/vendor/vendor-org/agreement`

## 7.11 Finance Service

Base path: `/api`

Purpose:

- wallet
- wallet ledger/topup preview
- referrals
- vendor payout summary/history
- delivery earnings summary
- admin finance summary
- refunds

Endpoints:

- `GET /api/wallet`
- `GET /api/wallet/overview`
- `GET /api/wallet/topup-config`
- `POST /api/wallet/topup-preview`
- `GET /api/wallet/ledger`
- `GET /api/referrals`
- `GET /api/referrals/summary`
- `POST /api/referrals/apply`
- `GET /api/vendor/finance/summary`
- `GET /api/vendor/finance/payout-history`
- `GET /api/delivery/earnings/summary`
- `GET /api/admin/finance/summary`
- `POST /api/admin/refunds/:orderId`

## 8. Main Business Flows

## 8.1 Login and identity flow

Main routes:

- user auth: `/api/auth/*`
- vendor auth: `/api/vendor/auth/*`
- staff auth: `/api/staff/auth/*`
- delivery auth: `/api/delivery/auth/*`

Flow:

1. Client authenticates through role-specific auth route.
2. Gateway or service verifies credentials/OTP/token.
3. JWT is returned.
4. Protected routes go through gateway auth middleware.
5. Gateway injects `x-user-*` headers.

## 8.2 Shopping order flow

Main routes:

- browse: `/api/shop/*`
- cart: `/api/orders/cart` or `/api/cart`
- checkout: `POST /api/shop/orders`
- payment: `/api/payments/*`
- order tracking: `/api/orders/*`

Flow:

1. User browses catalog through product-service.
2. Add-to-cart resolves product snapshot via product-service internal resolver.
3. On checkout, order-service:
   - validates cart
   - re-resolves product data
   - fetches address from user-service
   - applies coupon if present
   - creates order
4. Payment-service creates payment order.
5. Payment verification updates order-service.
6. Order-service creates delivery task if delivery address exists.
7. Notification-service can notify user on status changes.

## 8.3 Gifting order flow

Main routes:

- browse: `/api/gifting/*`
- designs: `/api/designs/*`
- cart: `/api/gifting/cart`
- checkout: `POST /api/gifting/orders`

Flow:

1. User browses gifting products.
2. If product requires design, design-service is used first.
3. Gifting cart stores `designId` alongside item.
4. At checkout, order-service re-validates item via internal gifting resolver.
5. Address is pulled from user-service.
6. Order is created, then payment/delivery continue similarly.

## 8.4 Delivery flow

Main routes:

- internal task creation: `POST /api/delivery/internal/tasks`
- rider task ops: `/api/delivery/tasks/*`
- delivery tracking: `/api/delivery/track/:orderId`

Flow:

1. Order-service creates delivery task internally.
2. Rider logs in via OTP.
3. Rider accepts task and updates pickup/location/delivery events.
4. Delivery-service updates order-service with delivery status.
5. Delivery-service may also emit notifications and real-time events.

## 8.5 Support and ticket flow

Main routes:

- customer/support: `/api/notifications/tickets*`
- gateway alias: `/api/tickets/*`
- admin/staff ticket ops: `/api/admin/tickets*`, `/api/staff/tickets*`
- vendor support: `/api/vendor/support/tickets*`

Flow:

1. User/vendor/delivery/admin creates ticket.
2. Notification-service stores it with visibility scope based on role.
3. Admin/staff can assign, escalate, reply, and change status.
4. WebSocket events notify users/staff in real time.

## 8.6 Admin operations flow

Main routes:

- `/api/admin/*`
- `/api/staff/*`
- `/api/admin/shop/*`
- `/api/admin/gifting/*`
- `/api/admin/banners/*`
- `/api/admin/finance/*`

Flow:

1. Admin/staff authenticates.
2. Gateway forwards to admin-service or product-service admin routes.
3. Admin can manage:
   - orders
   - vendors
   - customers
   - staff
   - controls/feature flags
   - delivery partners
   - coupons
   - reports and SLA

## 9. Important Observations

- `app-service` in gateway is a frontend aggregator, not a pure proxy.
- Product browsing and order placement are split:
  - product-service = catalog/configuration
  - order-service = cart/order lifecycle
- There are multiple alias endpoints in vendor routes for the same data.
- Internal service trust is based on `x-internal-token`.
- Payment service runs in mock mode if Razorpay credentials are missing.
- Notification/ticket service also acts like the support backend.

## 10. Health and Docs Endpoints

Every major service exposes:

- `/health`
- `/api-docs`

Examples:

- gateway: `/health`, `/api-docs`
- auth-service: `/health`, `/api-docs`
- product-service: `/health`, `/api-docs`
- order-service: `/health`, `/api-docs`
- notification-service: `/health`, `/api-docs`

