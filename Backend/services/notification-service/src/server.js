const http = require('http');
const app = require('./app');
const config = require('./config');
const mongoose = require('mongoose');
const logger = require('../../../shared/utils/logger');
const { initializeSocket } = require('./websocket/socket-manager');

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

    // Create HTTP server from Express app so Socket.IO can attach
    const server = http.createServer(app);

    // Initialize WebSocket server
    initializeSocket(server);

    server.listen(config.port, () => {
        console.log(`🔔 Notification Service running on http://localhost:${config.port}`);
        console.log(`⚡ WebSocket server ready on ws://localhost:${config.port}`);
        console.log(`📚 Swagger: http://localhost:${config.port}/api-docs`);
    });
})();
