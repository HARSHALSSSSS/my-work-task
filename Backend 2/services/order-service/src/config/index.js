require('dotenv').config();

const requireEnv = (envName) => {
    const value = process.env[envName];
    if (!value) {
        throw new Error(`${envName} is not set`);
    }

    return value;
};

module.exports = {
    port: Number(process.env.PORT || 8080),
    mongoUri: requireEnv('MONGO_URI'),
    internalServiceToken: process.env.INTERNAL_SERVICE_TOKEN || 'speedcopy-internal-dev-token',
    productServiceUrl: process.env.PRODUCT_SERVICE_URL,
    userServiceUrl: process.env.USER_SERVICE_URL,
    deliveryServiceUrl: process.env.DELIVERY_SERVICE_URL,
    notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL,
    publicBaseUrl:
        process.env.ORDER_SERVICE_PUBLIC_URL ||
        process.env.SERVICE_PUBLIC_URL,
};
