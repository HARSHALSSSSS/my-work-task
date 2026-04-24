require('dotenv').config();
module.exports = {
    port: process.env.PORT || 4005,
    mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/speedcopy_orders',
    internalServiceToken: process.env.INTERNAL_SERVICE_TOKEN || 'speedcopy-internal-dev-token',
    productServiceUrl: process.env.PRODUCT_SERVICE_URL || 'http://localhost:4003',
    userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:4002',
    deliveryServiceUrl: process.env.DELIVERY_SERVICE_URL || 'http://localhost:4009',
    notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4007',
};
