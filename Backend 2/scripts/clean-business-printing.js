/**
 * Clean Business Printing Products
 * Removes all existing business printing products from database
 * 
 * Run: node scripts/clean-business-printing.js
 */
require('dotenv').config({
    path: require('path').join(__dirname, '../services/product-service/.env'),
});
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/speedcopy_products';

// Product Schema (minimal for deletion)
const productSchema = new mongoose.Schema({
    name: String,
    flowType: String,
    businessPrintType: String,
    isActive: Boolean,
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema, 'products');

(async () => {
    try {
        await mongoose.connect(MONGO_URI, { family: 4 });
        console.log(`\n✅ Connected: ${MONGO_URI}\n`);

        // Find all business printing products
        const businessProducts = await Product.find({
            flowType: 'printing',
            businessPrintType: { $ne: '', $exists: true }
        });

        console.log(`Found ${businessProducts.length} business printing products:`);
        businessProducts.forEach(product => {
            console.log(`  - ${product.name} (${product.businessPrintType})`);
        });

        if (businessProducts.length > 0) {
            // Delete all business printing products
            const result = await Product.deleteMany({
                flowType: 'printing',
                businessPrintType: { $ne: '', $exists: true }
            });

            console.log(`\n🗑️  Deleted ${result.deletedCount} business printing products`);
            console.log('✅ Database cleaned! Now only admin-added products will show.\n');
        } else {
            console.log('\n✅ No business printing products found. Database is already clean.\n');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
})();