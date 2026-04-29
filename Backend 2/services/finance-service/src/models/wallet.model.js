const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, unique: true, index: true },
        userType: {
            type: String,
            enum: ['customer', 'vendor', 'delivery_partner', 'staff'],
            default: 'customer',
        },
        balance: { type: Number, default: 0, min: 0 },
        currency: { type: String, default: 'INR' },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Wallet', walletSchema);
