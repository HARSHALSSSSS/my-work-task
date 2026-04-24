const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true },
        orderId: { type: String, required: true },

        // Razorpay IDs
        razorpayOrderId: { type: String },
        razorpayPaymentId: { type: String },
        razorpaySignature: { type: String },

        amount: { type: Number, required: true }, // in paise (INR * 100)
        currency: { type: String, default: 'INR' },

        status: {
            type: String,
            enum: ['created', 'paid', 'failed', 'refunded'],
            default: 'created',
        },

        method: { type: String }, // upi, card, netbanking, etc.
        failureReason: { type: String },
    },
    { timestamps: true }
);

paymentSchema.index({ orderId: 1 });
paymentSchema.index({ userId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
