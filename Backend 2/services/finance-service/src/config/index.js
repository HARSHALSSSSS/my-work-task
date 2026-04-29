require('dotenv').config();

const isProduction = (process.env.NODE_ENV || 'development') === 'production';
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
    notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL,
    razorpay: {
        keyId: isProduction
            ? process.env.RAZORPAY_KEY_ID
            : (process.env.RAZORPAY_KEY_ID_TEST || process.env.RAZORPAY_KEY_ID),
        keySecret: isProduction
            ? process.env.RAZORPAY_KEY_SECRET
            : (process.env.RAZORPAY_KEY_SECRET_TEST || process.env.RAZORPAY_KEY_SECRET),
    },
    publicBaseUrl:
        process.env.FINANCE_SERVICE_PUBLIC_URL ||
        process.env.SERVICE_PUBLIC_URL,
};
