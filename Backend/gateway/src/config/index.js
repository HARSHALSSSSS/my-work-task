require('dotenv').config();

module.exports = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:4001',
    user: process.env.USER_SERVICE_URL || 'http://localhost:4002',
    product: process.env.PRODUCT_SERVICE_URL || 'http://localhost:4003',
    design: process.env.DESIGN_SERVICE_URL || 'http://localhost:4004',
    order: process.env.ORDER_SERVICE_URL || 'http://localhost:4005',
    payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:4006',
    notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4007',
    admin: process.env.ADMIN_SERVICE_URL || 'http://localhost:4008',
    delivery: process.env.DELIVERY_SERVICE_URL || 'http://localhost:4009',
    vendor: process.env.VENDOR_SERVICE_URL || 'http://localhost:4010',
    finance: process.env.FINANCE_SERVICE_URL || 'http://localhost:4011',
  },
};
