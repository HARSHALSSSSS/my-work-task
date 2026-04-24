const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema(
    {
        vendorId: { type: String, required: true, index: true }, // VendorOrg._id
        userId: { type: String, required: true, index: true }, // auth User._id

        name: { type: String, required: true, trim: true },
        internalCode: { type: String, trim: true, default: '' },
        address: {
            line1: { type: String, required: true, trim: true },
            line2: { type: String, trim: true },
            city: { type: String, required: true, trim: true },
            state: { type: String, required: true, trim: true },
            pincode: { type: String, required: true, trim: true },
        },
        location: {
            lat: { type: Number },
            lng: { type: Number },
        },
        phone: { type: String, trim: true },
        email: { type: String, trim: true },

        workingHours: { type: String, default: '9:00 AM - 9:00 PM' },
        operatingHours: {
            open: { type: String, default: '09:00' },
            close: { type: String, default: '21:00' },
        },
        workingDays: [{ type: String }], // ['Mon', 'Tue', ...]

        capacity: {
            maxOrdersPerDay: { type: Number, default: 50 },
            currentLoad: { type: Number, default: 0 },
            dailyLimit: { type: Number, default: 50 },
            maxConcurrentOrders: { type: Number, default: 10 },
        },

        supportedFlows: [{ type: String, enum: ['printing', 'gifting', 'shopping'] }],

        isActive: { type: Boolean, default: true },
        isAvailable: { type: Boolean, default: true }, // can be toggled by vendor
        availabilityReason: { type: String, default: '' },
        assignmentZones: { type: [String], default: [] },

        deletedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

storeSchema.index({ vendorId: 1, isActive: 1 });
storeSchema.index({ 'address.pincode': 1 });
storeSchema.index({ location: '2dsphere' }); // For geospatial queries

module.exports = mongoose.model('Store', storeSchema);
