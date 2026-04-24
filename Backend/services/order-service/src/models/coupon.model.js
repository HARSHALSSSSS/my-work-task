const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
    {
        code: { type: String, required: true, unique: true, uppercase: true, trim: true },
        description: { type: String, trim: true },

        discountType: {
            type: String,
            enum: ['percentage', 'flat'],
            required: true,
        },
        discountValue: { type: Number, required: true, min: 0 },
        maxDiscount: { type: Number, default: 0 }, // cap for percentage discounts (0 = no cap)
        minOrderValue: { type: Number, default: 0 },

        // Applicable flow types (empty = all)
        applicableFlows: [{ type: String, enum: ['printing', 'gifting', 'shopping'] }],

        usageLimit: { type: Number, default: 0 }, // 0 = unlimited
        usedCount: { type: Number, default: 0 },

        // Per-user limit
        perUserLimit: { type: Number, default: 1 },

        isActive: { type: Boolean, default: true },
        expiresAt: { type: Date },
    },
    { timestamps: true }
);

// code unique:true already creates index
couponSchema.index({ isActive: 1, expiresAt: 1 });

module.exports = mongoose.model('Coupon', couponSchema);
