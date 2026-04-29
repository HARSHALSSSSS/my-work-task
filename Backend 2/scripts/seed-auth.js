/**
 * SpeedCopy — Auth Database Seed
 * Seeds admin users for testing
 *
 * Run: cd services/auth-service && npm install && node ../../scripts/seed-auth.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/speedcopy_auth';
const isFresh = process.argv.includes('--fresh');

// ─── User Schema ──────────────────────────────────────────────
const userSchema = new mongoose.Schema(
    {
        firebaseUid: { type: String, unique: true, sparse: true },
        email: { type: String, required: true, unique: true, lowercase: true },
        password: { type: String, minlength: 6 },
        name: { type: String, required: true },
        phone: String,
        photoURL: String,
        role: {
            type: String,
            enum: ['user', 'vendor', 'admin', 'delivery_partner'],
            default: 'user',
        },
        isActive: { type: Boolean, default: true },
        isEmailVerified: { type: Boolean, default: false },
        vendorDetails: {
            businessName: String,
            businessAddress: String,
            gstNumber: String,
            isApproved: { type: Boolean, default: false },
        },
        deliveryDetails: {
            vehicleType: String,
            licenseNumber: String,
            isAvailable: { type: Boolean, default: false },
            isApproved: { type: Boolean, default: false },
        },
        lastLogin: Date,
        fcmToken: { type: String, default: '' },
        deletedAt: { type: Date, default: null },
        isBlocked: { type: Boolean, default: false },
        blockedReason: String,
    },
    { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) return next();
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

const User = mongoose.model('User', userSchema, 'users');

// ─── Seed Data ────────────────────────────────────────────
const ADMIN_USERS = [
    {
        name: 'Super Admin',
        email: 'admin@speedcopy.com',
        password: 'admin123',
        role: 'admin',
        phone: '+91-9999999999',
        isEmailVerified: true,
        isActive: true,
    },
    {
        name: 'John Vendor',
        email: 'vendor@speedcopy.com',
        password: 'vendor123',
        role: 'vendor',
        phone: '+91-8888888888',
        isEmailVerified: true,
        isActive: true,
        vendorDetails: {
            businessName: 'SpeedCopy Vendors',
            businessAddress: 'Connaught Place, New Delhi',
            gstNumber: 'GST123456789',
            isApproved: true,
        },
    },
    {
        name: 'Mike Delivery',
        email: 'delivery@speedcopy.com',
        password: 'delivery123',
        role: 'delivery_partner',
        phone: '+91-7777777777',
        isEmailVerified: true,
        isActive: true,
        deliveryDetails: {
            vehicleType: 'Bike',
            licenseNumber: 'DL123456789',
            isAvailable: true,
            isApproved: true,
        },
    },
    {
        name: 'Test Customer',
        email: 'customer@speedcopy.com',
        password: 'customer123',
        role: 'user',
        phone: '+91-6666666666',
        isEmailVerified: true,
        isActive: true,
    },
];

// ─── Run ──────────────────────────────────────────────────
(async () => {
    try {
        await mongoose.connect(MONGO_URI, { family: 4 });
        console.log(`\n✅ Connected: ${MONGO_URI}\n`);

        if (isFresh) {
            await User.deleteMany({});
            console.log('🗑  Cleared existing users\n');
        }

        let userCount = 0;

        for (const userData of ADMIN_USERS) {
            const { email, password, ...fields } = userData;
            
            // Check if user exists
            let user = await User.findOne({ email });
            
            if (user) {
                // Update existing user (don't update password if already hashed)
                Object.assign(user, fields);
                if (password && !user.password.startsWith('$2')) {
                    user.password = password; // Will be hashed by pre-save hook
                }
                await user.save();
            } else {
                // Create new user
                user = new User({ email, password, ...fields });
                await user.save(); // This triggers pre-save hook
            }
            
            userCount++;
            console.log(`👤 ${user.role.toUpperCase()}: ${user.name} (${user.email})`);
            console.log(`   └─ Password: ${userData.password}`);
            console.log(`   └─ Role: ${user.role}`);
            console.log('');
        }

        console.log(`✅ Seeded ${userCount} admin/test users`);
        console.log('\n📋 Login Credentials:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        ADMIN_USERS.forEach((user) => {
            console.log(`🔑 ${user.role.padEnd(15)} | ${user.email.padEnd(25)} | ${user.password}`);
        });
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
})();
