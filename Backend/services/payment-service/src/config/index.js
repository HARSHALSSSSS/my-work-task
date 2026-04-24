require('dotenv').config();

const isProduction = (process.env.NODE_ENV || 'development') === 'production';

module.exports = {
    port: process.env.PORT || 4006,
    mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/speedcopy_payments',
    razorpay: {
        keyId: isProduction
            ? process.env.RAZORPAY_KEY_ID
            : (process.env.RAZORPAY_KEY_ID_TEST || process.env.RAZORPAY_KEY_ID),
        keySecret: isProduction
            ? process.env.RAZORPAY_KEY_SECRET
            : (process.env.RAZORPAY_KEY_SECRET_TEST || process.env.RAZORPAY_KEY_SECRET),
    },
    orderServiceUrl: process.env.ORDER_SERVICE_URL || 'http://localhost:4005',
    internalServiceToken: process.env.INTERNAL_SERVICE_TOKEN || 'speedcopy-internal-dev-token',
};

