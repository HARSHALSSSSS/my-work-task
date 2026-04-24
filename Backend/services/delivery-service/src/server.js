require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');

const { config } = require('./config/index');
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
app.use('/api/delivery', deliveryRoutes);

app.use((err, req, res, next) => {
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
    console.log(`MongoDB connected: ${mongoose.connection.host} → ${mongoose.connection.name}`);

    app.listen(config.PORT, () => {
        console.log(`🚚 Delivery Service running on http://localhost:${config.PORT}`);
        console.log(`📚 Swagger: http://localhost:${config.PORT}/api-docs`);
    });
})();
