# SpeedCopy Backend

Production-ready Node.js microservices backend for the SpeedCopy multi-category platform (Printing, Gifting, Shopping).

---

## Architecture

```
Gateway (4000)
    ├── auth-service        (4001)  — JWT auth, signup/login
    ├── user-service        (4002)  — Profile, addresses
    ├── product-service     (4003)  — Unified products (printing/gifting/shopping)
    ├── design-service      (4004)  — Canvas designs, templates
    ├── order-service       (4005)  — Order lifecycle
    ├── payment-service     (4006)  — Razorpay integration
    ├── notification-service(4007)  — Email, SMS, in-app
    └── admin-service       (4008)  — Dashboard, analytics
```

All services share one MongoDB database (`speedcopy`).

---

## Prerequisites

- Node.js >= 18
- MongoDB running locally on port 27017
- npm

---

## Setup

### 1. Clone and install all dependencies

```bash
cd Backend
npm run install:all
```

### 2. Configure environment variables

Copy `.env.example` to `.env` in the root and in each service folder, then fill in your values:

```bash
cp .env.example .env
```

Key variables to set:
- `JWT_SECRET` — strong random string
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — from Razorpay dashboard
- `SMTP_*` — Gmail or any SMTP provider
- `TWILIO_*` — for SMS (optional)

### 3. Seed the database (optional)

```bash
npm run seed
```

### 4. Start all services in development

```bash
npm run dev
```

Or start a single service:

```bash
cd services/auth-service
npm run dev
```

---

## Swagger Docs

Each service exposes `/api-docs`:

| Service              | URL                                  |
|----------------------|--------------------------------------|
| Gateway              | http://localhost:4000/api-docs       |
| Auth Service         | http://localhost:4001/api-docs       |
| User Service         | http://localhost:4002/api-docs       |
| Product Service      | http://localhost:4003/api-docs       |
| Design Service       | http://localhost:4004/api-docs       |
| Order Service        | http://localhost:4005/api-docs       |
| Payment Service      | http://localhost:4006/api-docs       |
| Notification Service | http://localhost:4007/api-docs       |
| Admin Service        | http://localhost:4008/api-docs       |

---

## Key API Endpoints (via Gateway on port 4000)

### Auth
```
POST   /api/auth/signup
POST   /api/auth/login
GET    /api/auth/me
```

### Products
```
GET    /api/products                    # list (filter: flowType, category, search)
GET    /api/products/:id
GET    /api/products/slug/:slug
POST   /api/products                    # admin only
PUT    /api/products/:id                # admin only
DELETE /api/products/:id                # admin only
GET    /api/products/categories
POST   /api/products/categories         # admin only
```

### Designs
```
POST   /api/designs                     # save canvas JSON
GET    /api/designs                     # my designs
GET    /api/designs/:id
PUT    /api/designs/:id                 # re-edit
GET    /api/designs/templates
```

### Orders
```
POST   /api/orders
GET    /api/orders
GET    /api/orders/:id
PATCH  /api/orders/:id/status           # admin only
```

### Payments
```
POST   /api/payments/create
POST   /api/payments/verify
```

---

## Product Flow Types

| flowType  | requiresUpload | requiresDesign | Example                    |
|-----------|---------------|----------------|----------------------------|
| printing  | true          | false          | Document printing          |
| gifting   | false         | true           | Mug, T-shirt, Cushion      |
| shopping  | false         | false          | Regular ecommerce product  |

Business printing (flyers, business cards) uses `flowType: printing` + `requiresDesign: true`.

---

## Health Check

```bash
npm run health
```

---

## Project Structure

```
Backend/
├── gateway/                    # API Gateway (proxy + rate limiting)
├── services/
│   ├── auth-service/
│   ├── user-service/
│   ├── product-service/        # Unified: printing + gifting + shopping
│   ├── design-service/
│   ├── order-service/
│   ├── payment-service/
│   ├── notification-service/
│   └── admin-service/
├── shared/                     # Shared utils, middlewares, constants
│   ├── constants/
│   ├── middlewares/
│   ├── utils/
│   ├── database/
│   └── validators/
├── scripts/                    # Dev tooling
└── uploads/                    # File storage
```
