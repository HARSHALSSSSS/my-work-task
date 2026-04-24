require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const swaggerSpec = require('./swagger/swagger');
const adminRoutes = require('./routes/admin.routes');
const errorHandler = require('../../../shared/middlewares/error.middleware');

const staffRoutes = require('./routes/staff.routes');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'admin-service' }));
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);
module.exports = app;
