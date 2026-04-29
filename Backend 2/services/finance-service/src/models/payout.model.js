const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema(
    {
        vendorId: { type: String, required: true, index: true },

        amount: { type: Number, required: true, min: 0 },
        platformFee: { type: Number, default: 0 },
        netAmount: { type: Number, required: true },
        currency: { type: String, default: 'INR' },

        status: {
            type: String,
            enum: ['pending', 'processing', 'paid', 'failed'],
            default: 'pending',
        },

        orderIds: [{ type: String }],

        transferId: { type: String },
        transferredAt: { type: Date },
        failureReason: { type: String },

        periodStart: { type: Date },
        periodEnd: { type: Date },

        notes: { type: String },
    },
    { timestamps: true }
);

payoutSchema.index({ vendorId: 1, status: 1 });
payoutSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Payout', payoutSchema);
