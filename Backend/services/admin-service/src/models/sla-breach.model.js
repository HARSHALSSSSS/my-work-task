const mongoose = require('mongoose');


const slaBreachSchema = new mongoose.Schema(
    {
        orderId: { type: String, required: true, index: true },
        policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'SlaPolicy', required: true },
        policyName: { type: String, required: true },
        flowType: { type: String, required: true },

        fromStatus: { type: String, required: true },
        toStatus: { type: String, required: true },

        elapsedMinutes: { type: Number, required: true },
        maxMinutes: { type: Number, required: true },

        severity: {
            type: String,
            enum: ['warning', 'breach', 'critical'],
            default: 'breach',
        },

        isEscalated: { type: Boolean, default: false },
        escalatedAt: { type: Date, default: null },
        escalatedBy: { type: String, default: '' },
        escalationNote: { type: String, default: '' },

        isCompensated: { type: Boolean, default: false },
        compensationType: {
            type: String,
            enum: ['none', 'refund', 'wallet_credit', 'coupon'],
            default: 'none',
        },
        compensationValue: { type: Number, default: 0 },
        compensatedAt: { type: Date, default: null },
        compensatedBy: { type: String, default: '' },

        resolvedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

slaBreachSchema.index({ orderId: 1, policyId: 1 });
slaBreachSchema.index({ severity: 1, isEscalated: 1, createdAt: -1 });
slaBreachSchema.index({ flowType: 1, createdAt: -1 });

module.exports = mongoose.model('SlaBreach', slaBreachSchema);
