require('dotenv').config();
module.exports = {
    port: process.env.PORT || 4002,
    mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/speedcopy_users',
    orderServiceUrl: process.env.ORDER_SERVICE_URL || 'http://localhost:4005',
};
