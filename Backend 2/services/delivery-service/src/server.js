require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const logger = require('../../../shared/utils/logger');

const { config } = require('./config/index');
const { rootUploadDir } = require('./config/upload');
const deliveryRoutes = require('./routes/delivery.routes');
const swaggerSpec = require('./swagger');
const { errorResponse } = require('./utils/api-response');

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'delivery-service' }));
app.use('/uploads', express.static(path.join(rootUploadDir)));
app.use('/api/delivery', deliveryRoutes);

app.use((err, req, res, next) => {
    logger.error(err);
    res.status(500).json(errorResponse(err.message || 'Internal server error'));
});

(async () => {
    await mongoose.connect(config.MONGO_URI, {
        family: 4,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        maxPoolSize: 10,
        retryWrites: true,
        retryReads: true,
    });
    logger.info(`MongoDB connected: ${mongoose.connection.host} → ${mongoose.connection.name}`);

    const server = app.listen(config.PORT, () => {
        logger.info(`Delivery Service listening on port ${config.PORT}`);
        logger.info(`Delivery Service Swagger docs available at ${config.PUBLIC_BASE_URL}/api-docs`);
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
