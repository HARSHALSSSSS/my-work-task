require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger/swagger');
const notificationRoutes = require('./routes/notification.routes');
const errorHandler = require('../../../shared/middlewares/error.middleware');
const { getOnlineStats } = require('./websocket/socket-manager');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'notification-service' }));

// WebSocket connection stats (admin use)
app.get('/ws/status', (req, res) => {
    res.json({ success: true, data: getOnlineStats() });
});

app.use('/api/notifications', notificationRoutes);
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);
module.exports = app;
