const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        userId: { type: String, default: null },
        audienceRoles: {
            type: [String],
            default: [],
            validate: {
                validator: (roles) => Array.isArray(roles),
                message: 'audienceRoles must be an array',
            },
        },
        type: {
            type: String,
            enum: ['email', 'sms', 'push', 'in_app'],
            required: true,
        },
        title: { type: String, required: true },
        message: { type: String, required: true },
        category: {
            type: String,
            enum: ['orders', 'rewards', 'system', 'support', 'account', 'promotions'],
            default: 'system',
        },
        isRead: { type: Boolean, default: false },
        metadata: { type: mongoose.Schema.Types.Mixed }, // orderId, etc.
        actionUrl: { type: String, default: '' },
        status: {
            type: String,
            enum: ['pending', 'sent', 'failed'],
            default: 'pending',
        },
        error: { type: String },
    },
    { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ audienceRoles: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
