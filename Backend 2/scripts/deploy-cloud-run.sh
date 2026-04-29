#!/usr/bin/env bash

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-your-gcp-project-id}"
REGION="${REGION:-asia-south1}"

if [[ "${PROJECT_ID}" == "your-gcp-project-id" ]]; then
  echo "Set PROJECT_ID before running this script."
  exit 1
fi

build_image() {
  local dockerfile="$1"
  local image_name="$2"

  gcloud builds submit . \
    --config cloudbuild.service.yaml \
    --substitutions "_DOCKERFILE=${dockerfile},_IMAGE_NAME=${image_name}"
}

deploy_service() {
  local service_name="$1"
  local image_name="$2"

  gcloud run deploy "${service_name}" \
    --image "gcr.io/${PROJECT_ID}/${image_name}" \
    --region "${REGION}" \
    --platform managed \
    --allow-unauthenticated \
    --set-env-vars "NODE_ENV=production"
}

# Microservices
build_image "services/auth-service/Dockerfile" "auth-service"
deploy_service "auth-service" "auth-service"

build_image "services/user-service/Dockerfile" "user-service"
deploy_service "user-service" "user-service"

build_image "services/product-service/Dockerfile" "product-service"
deploy_service "product-service" "product-service"

build_image "services/design-service/Dockerfile" "design-service"
deploy_service "design-service" "design-service"

build_image "services/order-service/Dockerfile" "order-service"
deploy_service "order-service" "order-service"

build_image "services/payment-service/Dockerfile" "payment-service"
deploy_service "payment-service" "payment-service"

build_image "services/notification-service/Dockerfile" "notification-service"
deploy_service "notification-service" "notification-service"

build_image "services/admin-service/Dockerfile" "admin-service"
deploy_service "admin-service" "admin-service"

build_image "services/delivery-service/Dockerfile" "delivery-service"
deploy_service "delivery-service" "delivery-service"

build_image "services/vendor-service/Dockerfile" "vendor-service"
deploy_service "vendor-service" "vendor-service"

build_image "services/finance-service/Dockerfile" "finance-service"
deploy_service "finance-service" "finance-service"

# Optional gateway
build_image "gateway/Dockerfile" "gateway"
deploy_service "gateway" "gateway"
