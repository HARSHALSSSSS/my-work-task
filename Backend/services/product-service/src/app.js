require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const multer = require('multer');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

const swaggerSpec = require('./swagger/swagger');
const categoryRoutes = require('./routes/category.routes');
const productRoutes = require('./routes/product.routes');
const printingRoutes = require('./routes/printing.routes');
const businessPrintingRoutes = require('./routes/business-printing.routes');
const giftingRoutes = require('./routes/gifting.routes');
const shoppingRoutes = require('./routes/shopping.routes');
const adminShoppingRoutes = require('./routes/admin-shopping.routes');
const adminGiftingRoutes = require('./routes/admin-gifting.routes');
const bannerRoutes = require('./routes/banner.routes');
const internalShoppingRoutes = require('./routes/internal-shopping.routes');
const internalGiftingRoutes = require('./routes/internal-gifting.routes');
const errorHandler = require('../../../shared/middlewares/error.middleware');

const app = express();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'image/jpeg',
            'image/png',
            'image/gif',
            'text/plain',
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'product-service' }));

app.use('/api/products/categories', categoryRoutes);
app.use('/api/products/printing', upload.array('files', 10), printingRoutes);
app.use('/api/products/business-printing', upload.array('files', 10), businessPrintingRoutes);
app.use('/api/printing', upload.array('files', 10), printingRoutes);
app.use('/api/business-printing', upload.array('files', 10), businessPrintingRoutes);
app.use('/api/products/gifting', giftingRoutes);
app.use('/api/products/shopping', shoppingRoutes);
app.use('/api/gifting', giftingRoutes);
app.use('/api/shopping', shoppingRoutes);
app.use('/api/shop', shoppingRoutes);
app.use('/shopping', shoppingRoutes);
app.use('/api/admin/gifting', adminGiftingRoutes);
app.use('/api/admin/shop', adminShoppingRoutes);
app.use('/api/admin/banners', bannerRoutes);
app.use('/api/internal/gifting', internalGiftingRoutes);
app.use('/api/internal/shop', internalShoppingRoutes);
app.use('/api/products', productRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);

module.exports = app;
