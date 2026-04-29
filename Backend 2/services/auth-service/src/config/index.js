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
    publicBaseUrl:
        process.env.AUTH_SERVICE_PUBLIC_URL ||
        process.env.SERVICE_PUBLIC_URL,
};
