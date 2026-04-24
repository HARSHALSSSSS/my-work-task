require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const { initFirebase } = require('./config/firebase');
const swaggerSpec = require('./swagger/swagger');
const authRoutes = require('./routes/auth.routes');
const errorHandler = require('../../../shared/middlewares/error.middleware');

initFirebase(); // safe — falls back to mock if no credentials

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'auth-service' }));
app.use('/api/auth', authRoutes);
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);

module.exports = app;
