/**
 * Seed Gifting Products
 * Creates sample gifting products for testing
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const path = require('path');

// Import models
const Product = require('../services/product-service/src/models/product.model');
const Category = require('../services/product-service/src/models/category.model');

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/speedcopy';

const connectDB = async () => {
    try {
        await mongoose.connect(mongoUri, {
            family: 4,
            serverSelectionTimeoutMS: 10000,
        });
        console.log('✓ Connected to MongoDB');
    } catch (error) {
        console.error('✗ MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

const seedGiftingProducts = async () => {
    try {
        // Get gifting category
        const giftingCategory = await Category.findOne({
            $or: [{ slug: 'gifting' }, { flowType: 'gifting' }],
        });

        if (!giftingCategory) {
            console.error('✗ Gifting category not found. Please run seed-db.js first.');
            process.exit(1);
        }

        console.log(`✓ Found gifting category: ${giftingCategory.name}`);

        // Sample gifting products
        const products = [
            {
                name: 'Personalized Mug',
                slug: 'personalized-mug',
                sku: 'GIFT-MUG-001',
                description: 'Custom printed ceramic mug with your design',
                category: giftingCategory._id,
                flowType: 'gifting',
                basePrice: 299,
                mrp: 499,
                images: ['https://images.unsplash.com/photo-1514432324607-2e467f4af445?w=400&q=80'],
                thumbnail: 'https://images.unsplash.com/photo-1514432324607-2e467f4af445?w=400&q=80',
                isActive: true,
                requiresDesign: true,
                designMode: 'both',
                unit: 'piece',
            },
            {
                name: 'Custom T-Shirt',
                slug: 'custom-tshirt',
                sku: 'GIFT-TSHIRT-001',
                description: 'High-quality cotton t-shirt with custom print',
                category: giftingCategory._id,
                flowType: 'gifting',
                basePrice: 399,
                mrp: 699,
                images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80'],
                thumbnail: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80',
                isActive: true,
                requiresDesign: true,
                designMode: 'both',
                unit: 'piece',
            },
            {
                name: 'Photo Canvas',
                slug: 'photo-canvas',
                sku: 'GIFT-CANVAS-001',
                description: 'Premium canvas print with your favorite photo',
                category: giftingCategory._id,
                flowType: 'gifting',
                basePrice: 599,
                mrp: 999,
                images: ['https://images.unsplash.com/photo-1578500494198-246f612d03b3?w=400&q=80'],
                thumbnail: 'https://images.unsplash.com/photo-1578500494198-246f612d03b3?w=400&q=80',
                isActive: true,
                requiresDesign: true,
                designMode: 'both',
                unit: 'piece',
            },
            {
                name: 'Personalized Keychain',
                slug: 'personalized-keychain',
                sku: 'GIFT-KEY-001',
                description: 'Durable metal keychain with custom engraving',
                category: giftingCategory._id,
                flowType: 'gifting',
                basePrice: 149,
                mrp: 299,
                images: ['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80'],
                thumbnail: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80',
                isActive: true,
                requiresDesign: true,
                designMode: 'normal',
                unit: 'piece',
            },
            {
                name: 'Custom Photo Frame',
                slug: 'custom-photo-frame',
                sku: 'GIFT-FRAME-001',
                description: 'Wooden photo frame with personalized engraving',
                category: giftingCategory._id,
                flowType: 'gifting',
                basePrice: 349,
                mrp: 599,
                images: ['https://images.unsplash.com/photo-1609034227505-5876f6aa4e90?w=400&q=80'],
                thumbnail: 'https://images.unsplash.com/photo-1609034227505-5876f6aa4e90?w=400&q=80',
                isActive: true,
                requiresDesign: true,
                designMode: 'both',
                unit: 'piece',
            },
            {
                name: 'Personalized Water Bottle',
                slug: 'personalized-water-bottle',
                sku: 'GIFT-BOTTLE-001',
                description: 'Stainless steel water bottle with custom design',
                category: giftingCategory._id,
                flowType: 'gifting',
                basePrice: 449,
                mrp: 799,
                images: ['https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&q=80'],
                thumbnail: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&q=80',
                isActive: true,
                requiresDesign: true,
                designMode: 'both',
                unit: 'piece',
            },
        ];

        // Check if products already exist
        const existingSlugs = await Product.find({
            slug: { $in: products.map(p => p.slug) },
        }).select('slug');

        if (existingSlugs.length > 0) {
            console.log(`⚠ ${existingSlugs.length} products already exist. Skipping...`);
            return;
        }

        // Insert products
        const result = await Product.insertMany(products);
        console.log(`✓ Created ${result.length} gifting products`);

        result.forEach(p => {
            console.log(`  - ${p.name} (₹${p.basePrice})`);
        });
    } catch (error) {
        console.error('✗ Error seeding products:', error.message);
        process.exit(1);
    }
};

const main = async () => {
    await connectDB();
    await seedGiftingProducts();
    await mongoose.connection.close();
    console.log('✓ Done');
};

main();
