const mongoose = require('mongoose');


const slaPolicySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, trim: true, default: '' },

        flowType: {
            type: String,
            enum: ['printing', 'gifting', 'shopping', 'all'],
            required: true,
        },

        fromStatus: {
            type: String,
            enum: [
                'pending',
                'confirmed',
                'assigned_vendor',
                'vendor_accepted',
                'in_production',
                'qc_pending',
                'ready_for_pickup',
                'delivery_assigned',
                'out_for_delivery',
            ],
            required: true,
        },
        toStatus: {
            type: String,
            enum: [
                'confirmed',
                'assigned_vendor',
                'vendor_accepted',
                'in_production',
                'qc_pending',
                'ready_for_pickup',
                'delivery_assigned',
                'out_for_delivery',
                'delivered',
            ],
            required: true,
        },

        maxMinutes: { type: Number, required: true, min: 1 },
        warningMinutes: { type: Number, required: true, min: 1 },

        escalationLevel: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium',
        },

        compensationType: {
            type: String,
            enum: ['none', 'refund', 'wallet_credit', 'coupon'],
            default: 'none',
        },
        compensationValue: { type: Number, default: 0, min: 0 },

        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

slaPolicySchema.index({ flowType: 1, isActive: 1 });
slaPolicySchema.index({ fromStatus: 1, toStatus: 1 });

module.exports = mongoose.model('SlaPolicy', slaPolicySchema);
