const mongoose = require('mongoose');

const deliveryPartnerProfileSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, unique: true, index: true },
        phone: { type: String, unique: true, index: true, sparse: true },
        email: { type: String, default: '' },
        name: { type: String, default: '' },
        isAvailable: { type: Boolean, default: false, index: true },
        rating: { type: Number, default: 5.0 },
        totalTrips: { type: Number, default: 0 },
        totalEarnings: { type: Number, default: 0.0 },
        kycStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
        identityVerification: {
            idDocumentUrl: { type: String, default: '' },
            selfieUrl: { type: String, default: '' },
            submittedAt: { type: Date, default: null },
        },
        zoneAssignments: { type: [String], default: [] },
        vehicleType: { type: String, default: '' },
        payoutRatePerKm: { type: Number, default: null },
        payoutRatePerOrder: { type: Number, default: null },
    },
    { timestamps: true }
);

module.exports = mongoose.model('DeliveryPartnerProfile', deliveryPartnerProfileSchema);
