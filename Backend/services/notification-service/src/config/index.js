require('dotenv').config();
module.exports = {
    port: process.env.PORT || 4007,
    mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/speedcopy_notifications',
    smtp: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.EMAIL_FROM || 'noreply@speedcopy.com',
    },
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        phone: process.env.TWILIO_PHONE,
    },
};
