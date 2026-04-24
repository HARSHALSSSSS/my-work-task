require('dotenv').config();
module.exports = {
    port: process.env.PORT || 4008,
    mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/speedcopy_admin',
    internalServiceToken: process.env.INTERNAL_SERVICE_TOKEN || 'speedcopy-internal-dev-token',
    notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4007',
};
