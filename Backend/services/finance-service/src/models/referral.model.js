const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema(
    {
        referrerId: { type: String, required: true, index: true },
        referredId: { type: String, index: true },
        referralCode: { type: String, required: true, unique: true, uppercase: true },

        status: {
            type: String,
            enum: ['pending', 'completed', 'rewarded', 'expired'],
            default: 'pending',
        },

        rewardAmount: { type: Number, default: 0 },
        rewardedAt: { type: Date },

        // Condition: referral completes when referred user places first order
        firstOrderId: { type: String },
        completedAt: { type: Date },
    },
    { timestamps: true }
);

// referralCode unique:true already creates index
// referrerId already indexed via field definition

module.exports = mongoose.model('Referral', referralSchema);
