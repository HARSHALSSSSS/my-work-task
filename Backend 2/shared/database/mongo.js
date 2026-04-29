const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async (uri) => {
    const mongoUri = uri || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/speedcopy';

    const options = {
        family: 4,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        heartbeatFrequencyMS: 10000,
        maxPoolSize: 10,
        minPoolSize: 2,
        retryWrites: true,
        retryReads: true,
    };

    try {
        await mongoose.connect(mongoUri, options);
        logger.info(`MongoDB connected: ${mongoose.connection.host} → ${mongoose.connection.name}`);

        mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
        mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
        mongoose.connection.on('error', (err) => logger.error('MongoDB error: ' + err.message));
    } catch (err) {
        logger.error('MongoDB connection failed: ' + err.message);
        process.exit(1);
    }
};

module.exports = connectDB;
