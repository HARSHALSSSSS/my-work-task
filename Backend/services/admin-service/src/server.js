const app = require('./app');
const config = require('./config');
const mongoose = require('mongoose');
const logger = require('../../../shared/utils/logger');

const connectDB = async () => {
    await mongoose.connect(config.mongoUri, {
        family: 4,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        maxPoolSize: 10,
        retryWrites: true,
        retryReads: true,
    });
    logger.info(`MongoDB connected: ${mongoose.connection.host} → ${mongoose.connection.name}`);
};

(async () => {
    await connectDB();
    app.listen(config.port, () => {
        console.log(`🛡️  Admin Service running on http://localhost:${config.port}`);
        console.log(`📚 Swagger: http://localhost:${config.port}/api-docs`);
    });
})();
