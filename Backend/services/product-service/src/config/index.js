require('dotenv').config();

module.exports = {
    port: process.env.PORT || 4003,
    mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/speedcopy_products',
    nodeEnv: process.env.NODE_ENV || 'development',
};
