/**
 * SpeedCopy — Full Database Seed
 * Seeds: Categories + Subcategories for Printing, Gifting, Shopping
 * Products are added by admin via API — NOT seeded here.
 *
 * Run: node scripts/seed-db.js
 * Run fresh: node scripts/seed-db.js --fresh  (clears existing data)
 */
require('dotenv').config({
    path: require('path').join(__dirname, '../services/product-service/.env'),
});
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/speedcopy_products';
const isFresh = process.argv.includes('--fresh');

// ─── Schemas ──────────────────────────────────────────────
const categorySchema = new mongoose.Schema(
    {
        name: String,
        slug: String,
        description: String,
        flowType: String,
        image: String,
        isActive: { type: Boolean, default: true },
        sortOrder: Number,
    },
    { timestamps: true }
);

const subcategorySchema = new mongoose.Schema(
    {
        name: String,
        slug: String,
        description: String,
        category: mongoose.Schema.Types.ObjectId,
        flowType: String,
        image: String,
        isActive: { type: Boolean, default: true },
        sortOrder: Number,
    },
    { timestamps: true }
);

const shopSchema = new mongoose.Schema(
    {
        name: String,
        address: String,
        city: String,
        state: String,
        pincode: String,
        phone: String,
        workingHours: String,
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

const Category = mongoose.model('Category', categorySchema, 'categories');
const Subcategory = mongoose.model('Subcategory', subcategorySchema, 'subcategories');
const Shop = mongoose.model('Shop', shopSchema, 'shops');

// ─── Seed Data ────────────────────────────────────────────
const CATEGORIES = [
    {
        name: 'Printing',
        slug: 'printing',
        flowType: 'printing',
        description: 'Professional printing services for documents and business materials',
        sortOrder: 1,
        subcategories: [
            {
                name: 'Document Printing',
                slug: 'document-printing',
                description: 'Standard and binding options for documents, reports and thesis',
                sortOrder: 1,
                products: ['Standard Printing', 'Soft Binding', 'Spiral Binding', 'Thesis Binding'],
            },
            {
                name: 'Business Printing',
                slug: 'business-printing',
                description: 'Marketing and branding print materials for businesses',
                sortOrder: 2,
                products: ['Business Card', 'Flyers', 'Leaflets', 'Brochures', 'Posters'],
            },
        ],
    },
    {
        name: 'Gifting',
        slug: 'gifting',
        flowType: 'gifting',
        description: 'Customized gift products with your own design',
        sortOrder: 2,
        subcategories: [
            {
                name: 'Custom Gifts',
                slug: 'custom-gifts',
                description: 'Personalized gifts with custom designs',
                sortOrder: 1,
                products: ['Mug', 'Cushion', 'Keychain', 'T-Shirt', 'Frame'],
            },
        ],
    },
    {
        name: 'Shopping',
        slug: 'shopping',
        flowType: 'shopping',
        description: 'General ecommerce products',
        sortOrder: 3,
        subcategories: [
            {
                name: 'General Products',
                slug: 'general-products',
                description: 'All general ecommerce products',
                sortOrder: 1,
                products: [],
            },
        ],
    },
];

// ─── Run ──────────────────────────────────────────────────
(async () => {
    await mongoose.connect(MONGO_URI, { family: 4 });
    console.log(`\n✅ Connected: ${MONGO_URI}\n`);

    if (isFresh) {
        await Category.deleteMany({});
        await Subcategory.deleteMany({});
        console.log('🗑  Cleared existing categories and subcategories\n');
    }

    let catCount = 0;
    let subCount = 0;

    for (const catData of CATEGORIES) {
        const { subcategories, ...catFields } = catData;

        // Upsert category
        const cat = await Category.findOneAndUpdate({ slug: catFields.slug }, catFields, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
        });
        catCount++;
        console.log(`📁 Category: ${cat.name} (${cat.slug})`);

        // Upsert subcategories
        for (const subData of subcategories) {
            const { products, ...subFields } = subData;
            await Subcategory.findOneAndUpdate(
                { slug: subFields.slug, category: cat._id },
                { ...subFields, category: cat._id, flowType: catFields.flowType },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            subCount++;
            console.log(
                `   └─ ${subData.name}${products.length ? ` → products: ${products.join(', ')}` : ''}`
            );
        }
        console.log('');
    }

    console.log(`✅ Seeded ${catCount} categories, ${subCount} subcategories`);
    console.log('ℹ️  Products are added by admin via POST /api/products\n');

    // ─── Seed sample shops ──────────────────────────────────
    const shops = [
        {
            name: 'SpeedCopy - Connaught Place',
            address: 'Block A, Connaught Place',
            city: 'New Delhi',
            state: 'Delhi',
            pincode: '110001',
            phone: '+91-9876543210',
            workingHours: '9:00 AM - 9:00 PM',
        },
        {
            name: 'SpeedCopy - Lajpat Nagar',
            address: 'Central Market, Lajpat Nagar',
            city: 'New Delhi',
            state: 'Delhi',
            pincode: '110024',
            phone: '+91-9876543211',
            workingHours: '9:00 AM - 9:00 PM',
        },
        {
            name: 'SpeedCopy - Koramangala',
            address: '5th Block, Koramangala',
            city: 'Bengaluru',
            state: 'Karnataka',
            pincode: '560095',
            phone: '+91-9876543212',
            workingHours: '8:00 AM - 10:00 PM',
        },
        {
            name: 'SpeedCopy - Bandra West',
            address: 'Hill Road, Bandra West',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400050',
            phone: '+91-9876543213',
            workingHours: '9:00 AM - 9:00 PM',
        },
        {
            name: 'SpeedCopy - Anna Nagar',
            address: '2nd Avenue, Anna Nagar',
            city: 'Chennai',
            state: 'Tamil Nadu',
            pincode: '600040',
            phone: '+91-9876543214',
            workingHours: '9:00 AM - 9:00 PM',
        },
    ];

    if (isFresh) await Shop.deleteMany({});
    for (const shop of shops) {
        await Shop.findOneAndUpdate({ name: shop.name }, shop, { upsert: true, new: true });
    }
    console.log(`✅ Seeded ${shops.length} pickup shops\n`);

    await mongoose.disconnect();
})();
