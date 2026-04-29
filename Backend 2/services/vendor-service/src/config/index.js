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
    orderServiceUrl: process.env.ORDER_SERVICE_URL,
    authDbUri: process.env.AUTH_DB_URI,
    orderDbUri: process.env.ORDER_DB_URI,
    notificationDbUri: process.env.NOTIFICATION_DB_URI,
    internalServiceToken: process.env.INTERNAL_SERVICE_TOKEN || 'speedcopy-internal-dev-token',
    publicBaseUrl:
        process.env.VENDOR_SERVICE_PUBLIC_URL ||
        process.env.SERVICE_PUBLIC_URL,
};
