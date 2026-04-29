# Cloud Run Preparation Summary

## What Changed

- All service entrypoints now use `process.env.PORT` with a default of `8080`.
- Cross-service URLs are environment-driven and fail fast in production when required service URLs are missing.
- Startup and error logging now go to stdout/stderr in production, which matches Cloud Run expectations.
- Swagger server URLs are now environment-driven via `SERVICE_PUBLIC_URL` or a service-specific public URL variable.
- Every service and the gateway now has a Dockerfile and `.dockerignore`.
- A reusable Cloud Build config and a deployment script were added under `Backend/`.

## Dockerfile Example

This is the reusable pattern used for each service Dockerfile:

```dockerfile
FROM node:18

ENV NODE_ENV=production
WORKDIR /app

COPY services/auth-service/package*.json ./services/auth-service/
WORKDIR /app/services/auth-service
RUN npm ci --omit=dev && npm cache clean --force

WORKDIR /app
COPY shared ./shared
COPY services/auth-service ./services/auth-service

WORKDIR /app/services/auth-service
EXPOSE 8080
CMD ["npm", "start"]
```

## Example Updated Server

```js
const server = app.listen(config.port, () => {
    logger.info(`Auth Service listening on port ${config.port}`);
    logger.info(`Auth Service Swagger docs available at ${config.publicBaseUrl}/api-docs`);
});

process.on('unhandledRejection', (err) => {
    logger.error(err);
    server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
    logger.error(err);
    process.exit(1);
});
```

## Required Environment Variables

Set `NODE_ENV=production` on Cloud Run for every deployed service.

### Gateway

- `JWT_SECRET`
- `AUTH_SERVICE_URL`
- `USER_SERVICE_URL`
- `PRODUCT_SERVICE_URL`
- `DESIGN_SERVICE_URL`
- `ORDER_SERVICE_URL`
- `PAYMENT_SERVICE_URL`
- `NOTIFICATION_SERVICE_URL`
- `ADMIN_SERVICE_URL`
- `DELIVERY_SERVICE_URL`
- `VENDOR_SERVICE_URL`
- `FINANCE_SERVICE_URL`
- Optional: `INTERNAL_SERVICE_TOKEN`, `GATEWAY_PUBLIC_URL`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_WINDOW_MS`, `AUTH_RATE_LIMIT_MAX`

### Auth Service

- `MONGO_URI`
- `JWT_SECRET`
- Firebase credentials:
- Either `FIREBASE_SERVICE_ACCOUNT_PATH`
- Or `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- Optional: `GC_CLIENT_ID`, `ADMIN_ALLOWED_EMAILS`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`, `TWILIO_DEFAULT_COUNTRY_CODE`, `AUTH_SERVICE_PUBLIC_URL`

### User Service

- `MONGO_URI`
- `ORDER_SERVICE_URL`
- Optional: `USER_SERVICE_PUBLIC_URL`

### Product Service

- `MONGO_URI`
- Optional: `PRODUCT_SERVICE_PUBLIC_URL`

### Design Service

- `MONGO_URI`
- Optional: `DESIGN_SERVICE_PUBLIC_URL`

### Order Service

- `MONGO_URI`
- `INTERNAL_SERVICE_TOKEN`
- `PRODUCT_SERVICE_URL`
- `USER_SERVICE_URL`
- `DELIVERY_SERVICE_URL`
- `NOTIFICATION_SERVICE_URL`
- Optional: `ORDER_SERVICE_PUBLIC_URL`

### Payment Service

- `MONGO_URI`
- `ORDER_SERVICE_URL`
- `INTERNAL_SERVICE_TOKEN`
- Razorpay:
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` for production
- Optional: `RAZORPAY_KEY_ID_TEST`, `RAZORPAY_KEY_SECRET_TEST`, `PAYMENT_SERVICE_PUBLIC_URL`

### Notification Service

- `MONGO_URI`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- Optional: `EMAIL_FROM`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE`, `CORS_ORIGIN`, `NOTIFICATION_SERVICE_PUBLIC_URL`

### Admin Service

- `MONGO_URI`
- `AUTH_SERVICE_URL`
- `NOTIFICATION_SERVICE_URL`
- `INTERNAL_SERVICE_TOKEN`
- Optional cross-database analytics variables if you use those admin endpoints:
- `AUTH_DB_URI`, `USER_DB_URI`, `FINANCE_DB_URI`, `ORDER_DB_URI`, `VENDOR_DB_URI`, `NOTIFICATION_DB_URI`, `DELIVERY_DB_URI`
- Optional: `ADMIN_SERVICE_PUBLIC_URL`

### Delivery Service

- `MONGO_URI`
- `JWT_SECRET`
- `INTERNAL_SERVICE_TOKEN`
- `NOTIFICATION_SERVICE_URL`
- `ORDER_SERVICE_URL`
- `FINANCE_SERVICE_URL`
- Optional integrations: `GOOGLE_MAPS_API_KEY`, `GOOGLE_MAPS_GEOCODING_URL`, `GOOGLE_MAPS_ROUTES_URL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`, `DELIVERY_SERVICE_PUBLIC_URL`

### Vendor Service

- `MONGO_URI`
- `ORDER_SERVICE_URL`
- `INTERNAL_SERVICE_TOKEN`
- Optional cross-database variables used by reporting/support endpoints:
- `AUTH_DB_URI`, `ORDER_DB_URI`, `NOTIFICATION_DB_URI`
- Optional: `VENDOR_SERVICE_PUBLIC_URL`

### Finance Service

- `MONGO_URI`
- `INTERNAL_SERVICE_TOKEN`
- `NOTIFICATION_SERVICE_URL`
- Razorpay:
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` for production
- Optional: `RAZORPAY_KEY_ID_TEST`, `RAZORPAY_KEY_SECRET_TEST`, `FINANCE_SERVICE_PUBLIC_URL`

## Deployment Commands

Run these from `Backend/`.

```bash
PROJECT_ID="your-gcp-project-id"
REGION="asia-south1"
SERVICE_NAME="auth-service"

gcloud builds submit . \
  --config cloudbuild.service.yaml \
  --substitutions "_DOCKERFILE=services/auth-service/Dockerfile,_IMAGE_NAME=${SERVICE_NAME}"

gcloud run deploy "${SERVICE_NAME}" \
  --image "gcr.io/${PROJECT_ID}/${SERVICE_NAME}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production"
```

The full reusable script is at `Backend/scripts/deploy-cloud-run.sh`.

## Pre-Deployment Checklist

- Every service listens on `PORT` and does not rely on a fixed local port.
- Every Cloud Run service has its required `MONGO_URI` and secret values configured.
- Every inter-service dependency points to a deployed Cloud Run URL, not `localhost`.
- Gateway service URLs match the current deployed service URLs.
- `INTERNAL_SERVICE_TOKEN` is the same value across services that trust internal calls.
- MongoDB/Atlas allows connections from Cloud Run and uses the production connection string.
- Optional providers like Razorpay, Firebase, SMTP, Twilio, and Google Maps are configured where their routes are used.
- Health endpoints respond successfully after deployment.
