/**
 * Seed Shopping Categories with Images and Starting Prices
 * Run: node scripts/seed-shopping-categories.js
 */
require('dotenv').config({
    path: require('path').join(__dirname, '../services/product-service/.env'),
});
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/speedcopy_products';

const categorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        slug: { type: String, required: true, unique: true, lowercase: true },
        description: { type: String, trim: true },
        flowType: {
            type: String,
            enum: ['printing', 'gifting', 'shopping'],
            required: true,
        },
        image: { type: String },
        section: {
            type: String,
            enum: ['printing', 'gifting', 'shopping'],
        },
        starting_from: { type: Number, min: 0, default: null },
        isActive: { type: Boolean, default: true },
        sortOrder: { type: Number, default: 0 },
    },
    { timestamps: true }
);

const Category = mongoose.model('Category', categorySchema, 'categories');

const SHOPPING_CATEGORIES = [
    {
        name: 'Notebooks & Pads',
        slug: 'notebooks-pads',
        description: 'Premium quality notebooks and writing pads',
        flowType: 'shopping',
        section: 'shopping',
        image: 'https://images.unsplash.com/photo-1507842217343-583f20270319?w=400&h=300&fit=crop',
        starting_from: 99,
        sortOrder: 1,
    },
    {
        name: 'Pens & Pencils',
        slug: 'pens-pencils',
        description: 'High-quality writing instruments',
        flowType: 'shopping',
        section: 'shopping',
        image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=300&fit=crop',
        starting_from: 49,
        sortOrder: 2,
    },
    {
        name: 'Desk Organizers',
        slug: 'desk-organizers',
        description: 'Keep your workspace organized and productive',
        flowType: 'shopping',
        section: 'shopping',
        image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=400&h=300&fit=crop',
        starting_from: 199,
        sortOrder: 3,
    },
    {
        name: 'Sticky Notes & Markers',
        slug: 'sticky-notes-markers',
        description: 'Colorful sticky notes and markers for planning',
        flowType: 'shopping',
        section: 'shopping',
        image: 'https://images.unsplash.com/photo-1589939705882-dd1b11ae6a17?w=400&h=300&fit=crop',
        starting_from: 29,
        sortOrder: 4,
    },
    {
        name: 'Folders & Files',
        slug: 'folders-files',
        description: 'Organize documents with our folder collection',
        flowType: 'shopping',
        section: 'shopping',
        image: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=400&h=300&fit=crop',
        starting_from: 79,
        sortOrder: 5,
    },
    {
        name: 'Stationery Sets',
        slug: 'stationery-sets',
        description: 'Complete stationery sets for students and professionals',
        flowType: 'shopping',
        section: 'shopping',
        image: 'https://images.unsplash.com/photo-1599599810694-b5ac4dd64b73?w=400&h=300&fit=crop',
        starting_from: 299,
        sortOrder: 6,
    },
];

(async () => {
    try {
        await mongoose.connect(MONGO_URI, { family: 4 });
        console.log(`\n✅ Connected: ${MONGO_URI}\n`);

        let count = 0;
        for (const catData of SHOPPING_CATEGORIES) {
            const cat = await Category.findOneAndUpdate(
                { slug: catData.slug },
                catData,
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            count++;
            console.log(`✅ ${cat.name} (₹${cat.starting_from})`);
        }

        console.log(`\n✅ Seeded ${count} shopping categories\n`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
})();
