const mongoose = require('mongoose');


const ledgerSchema = new mongoose.Schema(
    {
        walletId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Wallet',
            required: true,
            index: true,
        },
        userId: { type: String, required: true, index: true },

        type: {
            type: String,
            enum: ['credit', 'debit'],
            required: true,
        },

        category: {
            type: String,
            enum: [
                'order_payment', // customer paid for order
                'refund', // refund credited to wallet
                'referral_reward', // referral bonus
                'payout', // vendor payout
                'payout_deduction', // platform fee deducted from vendor
                'admin_credit', // manual credit by admin
                'admin_debit', // manual debit by admin
                'wallet_topup', // customer topped up wallet
                'delivery_earning', // delivery partner earning
            ],
            required: true,
        },

        amount: { type: Number, required: true, min: 0 },
        balanceBefore: { type: Number, required: true },
        balanceAfter: { type: Number, required: true },

     
        referenceId: { type: String }, // orderId, payoutId, etc.
        referenceType: { type: String }, // 'order', 'payout', 'referral'

        description: { type: String, trim: true },
        metadata: { type: mongoose.Schema.Types.Mixed },
    },
    { timestamps: true }
);

ledgerSchema.index({ userId: 1, createdAt: -1 });
ledgerSchema.index({ walletId: 1, createdAt: -1 });

module.exports = mongoose.model('Ledger', ledgerSchema);
