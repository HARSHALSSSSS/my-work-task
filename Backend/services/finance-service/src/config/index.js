require('dotenv').config();

const isProduction = (process.env.NODE_ENV || 'development') === 'production';

module.exports = {
    port: process.env.PORT || 4011,
    mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/speedcopy_finance',
    internalServiceToken: process.env.INTERNAL_SERVICE_TOKEN || 'speedcopy-internal-dev-token',
    razorpay: {
        keyId: isProduction
            ? process.env.RAZORPAY_KEY_ID
            : (process.env.RAZORPAY_KEY_ID_TEST || process.env.RAZORPAY_KEY_ID),
        keySecret: isProduction
            ? process.env.RAZORPAY_KEY_SECRET
            : (process.env.RAZORPAY_KEY_SECRET_TEST || process.env.RAZORPAY_KEY_SECRET),
    },
};
