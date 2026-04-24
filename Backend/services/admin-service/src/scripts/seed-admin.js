/**
 * Seed Admin Account
 * Creates a default admin user for development
 * 
 * Run: node scripts/seed-admin.js
 */
require('dotenv').config({
    path: require('path').join(__dirname, '../.env'),
});
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/speedcopy_admin';

// Admin Schema
const adminSchema = new mongoose.Schema(
    {
        email: { type: String, required: true, unique: true, lowercase: true },
        password: { type: String, required: true },
        name: { type: String, required: true },
        role: { type: String, enum: ['admin', 'moderator', 'support'], default: 'admin' },
        isActive: { type: Boolean, default: true },
        lastLogin: { type: Date },
        loginAttempts: { type: Number, default: 0 },
        isLocked: { type: Boolean, default: false },
        permissions: [String],
    },
    { timestamps: true }
);

const Admin = mongoose.model('Admin', adminSchema, 'admins');

(async () => {
    try {
        await mongoose.connect(MONGO_URI, { family: 4 });
        console.log(`\n✅ Connected to MongoDB: ${MONGO_URI}\n`);

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email: 'admin@speedcopy.com' });
        
        if (existingAdmin) {
            console.log('⚠️  Admin account already exists');
            console.log(`   Email: ${existingAdmin.email}`);
            console.log(`   Role: ${existingAdmin.role}`);
            console.log(`   Created: ${existingAdmin.createdAt}\n`);
            process.exit(0);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash('Admin@123456', 10);

        // Create admin account
        const admin = new Admin({
            email: 'admin@speedcopy.com',
            password: hashedPassword,
            name: 'System Administrator',
            role: 'admin',
            isActive: true,
            permissions: [
                'system.kill_switch',
                'system.feature_flags',
                'finance.full_access',
                'orders.full_control',
                'vendors.full_control',
                'customers.full_control',
                'staff.management',
                'reports.all',
                'audit.full_access',
                'platform.config'
            ],
        });

        await admin.save();

        console.log('✅ Admin account created successfully!\n');
        console.log('📋 Login Credentials:');
        console.log('   Email: admin@speedcopy.com');
        console.log('   Password: Admin@123456');
        console.log('   MFA Code (dev): 123456\n');
        console.log('🔐 Security Notes:');
        console.log('   • Change password after first login');
        console.log('   • Enable real MFA before production');
        console.log('   • Use strong passwords for team members\n');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
})();
