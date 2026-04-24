const mongoose = require('mongoose');

/**
 * Physical SpeedCopy shop locations for pickup orders.
 */
const shopSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        address: { type: String, required: true, trim: true },
        city: { type: String, required: true, trim: true },
        state: { type: String, required: true, trim: true },
        pincode: { type: String, required: true, trim: true },
        phone: { type: String, trim: true },
        email: { type: String, trim: true },
        location: {
            lat: { type: Number },
            lng: { type: Number },
        },
        workingHours: { type: String, default: '9:00 AM - 9:00 PM' },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

shopSchema.index({ pincode: 1 });

module.exports = mongoose.model('Shop', shopSchema);
