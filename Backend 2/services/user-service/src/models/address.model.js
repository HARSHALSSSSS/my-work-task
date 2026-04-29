const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true },
        label: { type: String, enum: ['Home', 'Office', 'Other'], default: 'Home' },
        fullName: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
        houseNo: { type: String, trim: true, default: '' },
        area: { type: String, trim: true, default: '' },
        landmark: { type: String, trim: true, default: '' },
        line1: { type: String, required: true, trim: true },
        line2: { type: String, trim: true },
        city: { type: String, required: true, trim: true },
        state: { type: String, required: true, trim: true },
        pincode: { type: String, required: true, trim: true },
        country: { type: String, default: 'India' },
        location: {
            lat: { type: Number },
            lng: { type: Number },
            accuracyMeters: { type: Number },
            source: { type: String, trim: true },
            capturedAt: { type: Date },
        },
        isDefault: { type: Boolean, default: false },
    },
    { timestamps: true }
);

addressSchema.index({ userId: 1 });

module.exports = mongoose.model('Address', addressSchema);
