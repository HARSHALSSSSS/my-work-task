require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const proxy = require('express-http-proxy');

const swaggerSpec = require('./swagger/swagger');
const { defaultLimiter } = require('./middlewares/rate-limit');
const errorHandler = require('./middlewares/error-handler');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const appRoutes = require('./routes/app.routes');
const shopRoutes = require('./routes/shop.routes');
const giftingRoutes = require('./routes/gifting.routes');
const shoppingRoutes = require('./routes/shopping.routes');
const printingRoutes = require('./routes/printing.routes');
const businessPrintingRoutes = require('./routes/business-printing.routes');
const cartRoutes = require('./routes/cart.routes');
const designRoutes = require('./routes/design.routes');
const orderRoutes = require('./routes/order.routes');
const paymentRoutes = require('./routes/payment.routes');
const notificationRoutes = require('./routes/notification.routes');
const adminShopRoutes = require('./routes/admin-shop.routes');
const adminRoutes = require('./routes/admin.routes');
const staffRoutes = require('./routes/staff.routes');
const deliveryRoutes = require('./routes/delivery.routes');
const vendorRoutes = require('./routes/vendor.routes');
const financeRoutes = require('./routes/finance.routes');
const ticketRoutes = require('./routes/ticket.routes');

const app = express();

// ─── Security & Parsing ────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(defaultLimiter);

// ─── Swagger ───────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── Health ────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'gateway' }));
app.use(
    '/uploads/users',
    proxy(process.env.USER_SERVICE_URL || 'http://localhost:4002', {
        proxyReqPathResolver: (req) => req.originalUrl,
    })
);
app.use(
    '/uploads/vendors',
    proxy(process.env.VENDOR_SERVICE_URL || 'http://localhost:4010', {
        proxyReqPathResolver: (req) => req.originalUrl,
    })
);
app.use(
    '/uploads/admin',
    proxy(process.env.ADMIN_SERVICE_URL || 'http://localhost:4008', {
        proxyReqPathResolver: (req) => req.originalUrl,
    })
);
app.use(
    '/uploads',
    proxy(process.env.PRODUCT_SERVICE_URL || 'http://localhost:4003', {
        proxyReqPathResolver: (req) => req.originalUrl,
    })
);

// ─── Routes ────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/app', appRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/printing', printingRoutes);
app.use('/api/business-printing', businessPrintingRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/shopping', shoppingRoutes);
app.use('/api/gifting', giftingRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/designs', designRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminShopRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api', financeRoutes);

// ─── 404 ───────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ─── Error Handler ─────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
