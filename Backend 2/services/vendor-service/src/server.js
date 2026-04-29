const app = require('./app');
const config = require('./config');
const mongoose = require('mongoose');
const logger = require('../../../shared/utils/logger');

const connectDB = async () => {
    await mongoose.connect(config.mongoUri, {
        family: 4,
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10,
    });
    logger.info(`MongoDB connected: ${mongoose.connection.host} → ${mongoose.connection.name}`);
};

(async () => {
    await connectDB();
    const server = app.listen(config.port, () => {
        logger.info(`Vendor Service listening on port ${config.port}`);
        logger.info(`Vendor Service Swagger docs available at ${config.publicBaseUrl}/api-docs`);
    });

    process.on('unhandledRejection', (err) => {
        logger.error(err);
        server.close(() => process.exit(1));
    });

    process.on('uncaughtException', (err) => {
        logger.error(err);
        process.exit(1);
    });
})();
