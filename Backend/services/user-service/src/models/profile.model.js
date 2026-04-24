const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, unique: true }, // from auth-service
        name: { type: String, trim: true },
        phone: { type: String, trim: true },
        avatar: { type: String },
        dateOfBirth: { type: Date },
        gender: { type: String, enum: ['male', 'female', 'other'] },
        preferences: {
            notifications: { type: Boolean, default: true },
            newsletter: { type: Boolean, default: false },
            push: { type: Boolean, default: true },
            whatsapp: { type: Boolean, default: true },
            criticalAlerts: { type: Boolean, default: true },
            quietHours: {
                start: { type: String, default: '' },
                end: { type: String, default: '' },
            },
        },
        wishlist: [
            {
                productId: { type: String, required: true },
                productType: { type: String, enum: ['gifting', 'shopping', 'printing', 'business-printing'], default: 'gifting' },
                addedAt: { type: Date, default: Date.now },
            },
        ],
        privacyRequests: {
            dataExportRequestedAt: { type: Date, default: null },
            dataExportStatus: {
                type: String,
                enum: ['none', 'requested', 'processing', 'completed'],
                default: 'none',
            },
            accountDeletionRequestedAt: { type: Date, default: null },
            accountDeletionStatus: {
                type: String,
                enum: ['none', 'requested', 'blocked_active_orders', 'processing', 'completed'],
                default: 'none',
            },
            accountDeletionReason: { type: String, default: '' },
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Profile', profileSchema);
