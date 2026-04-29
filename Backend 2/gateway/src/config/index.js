require('dotenv').config();
const isProduction = (process.env.NODE_ENV || 'development') === 'production';
const resolveServiceUrl = (envName, fallback) => {
  const value = process.env[envName];
  if (value) return value;
  if (isProduction) {
    throw new Error(`${envName} is required in production`);
  }

  return fallback;
};

module.exports = {
  port: Number(process.env.PORT || 8080),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,
  services: {
    auth: resolveServiceUrl('AUTH_SERVICE_URL', 'http://localhost:4001'),
    user: resolveServiceUrl('USER_SERVICE_URL', 'http://localhost:4002'),
    product: resolveServiceUrl('PRODUCT_SERVICE_URL', 'http://localhost:4003'),
    design: resolveServiceUrl('DESIGN_SERVICE_URL', 'http://localhost:4004'),
    order: resolveServiceUrl('ORDER_SERVICE_URL', 'http://localhost:4005'),
    payment: resolveServiceUrl('PAYMENT_SERVICE_URL', 'http://localhost:4006'),
    notification: resolveServiceUrl('NOTIFICATION_SERVICE_URL', 'http://localhost:4007'),
    admin: resolveServiceUrl('ADMIN_SERVICE_URL', 'http://localhost:4008'),
    delivery: resolveServiceUrl('DELIVERY_SERVICE_URL', 'http://localhost:4009'),
    vendor: resolveServiceUrl('VENDOR_SERVICE_URL', 'http://localhost:4010'),
    finance: resolveServiceUrl('FINANCE_SERVICE_URL', 'http://localhost:4011'),
  },
  publicBaseUrl: process.env.GATEWAY_PUBLIC_URL || process.env.SERVICE_PUBLIC_URL || `http://localhost:${process.env.PORT || 8080}`,
};
