require('dotenv').config();

module.exports = {
    port: process.env.PORT || 4001,
    mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/speedcopy_auth',
    nodeEnv: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET || 'speedcopy-dev-secret',
    adminAllowedEmails: (process.env.ADMIN_ALLOWED_EMAILS || 'admin@speedcopy.com')
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    googleClientId: process.env.GC_CLIENT_ID || '',
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID || '',
        authToken: process.env.TWILIO_AUTH_TOKEN || '',
        verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID || '',
        defaultCountryCode: process.env.TWILIO_DEFAULT_COUNTRY_CODE || '+91',
    },
};
