const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User model — supports both Firebase Auth and email/password auth.
 * Firebase handles password/OTP/social login.
 * We store profile, role, and status here.
 */
const userSchema = new mongoose.Schema(
    {
        // Firebase UID — primary identifier from Firebase Auth (optional for email/password users)
        firebaseUid: {
            type: String,
            unique: true,
            sparse: true,
            index: true,
        },

        // Google OAuth2 sub — used for Google Sign-In on user/delivery apps
        googleId: {
            type: String,
            unique: true,
            sparse: true,
            index: true,
        },

        // Email/password auth fields
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
        },

        password: {
            type: String,
            minlength: [6, 'Password must be at least 6 characters'],
        },

        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            maxlength: 100,
        },

        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
        },

        phone: {
            type: String,
            trim: true,
        },

        photoURL: {
            type: String,
        },

        // 4 roles supported
        role: {
            type: String,
            enum: ['user', 'vendor', 'admin', 'staff', 'delivery_partner'],
            default: 'user',
        },

        staffProfile: {
            team: {
                type: String,
                enum: ['ops', 'support', 'finance', 'marketing'],
                default: 'ops',
            },
            permissions: { type: [String], default: [] },
            scopes: { type: [String], default: [] },
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        isEmailVerified: {
            type: Boolean,
            default: false,
        },

        // Vendor-specific
        vendorDetails: {
            businessName: String,
            businessAddress: String,
            gstNumber: String,
            isApproved: { type: Boolean, default: false },
        },

        // Delivery partner-specific
        deliveryDetails: {
            vehicleType: String,
            licenseNumber: String,
            isAvailable: { type: Boolean, default: false },
            isApproved: { type: Boolean, default: false },
            kycStatus: {
                type: String,
                enum: ['pending', 'approved', 'rejected'],
                default: 'pending',
            },
            zoneAssignments: { type: [String], default: [] },
        },

        lastLogin: Date,

        // Push notification token
        fcmToken: { type: String, default: '' },

        // Soft delete
        deletedAt: { type: Date, default: null },

        // Block flag (separate from isActive — isActive = admin deactivated, isBlocked = abuse)
        isBlocked: { type: Boolean, default: false },
        blockedReason: { type: String },
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

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
