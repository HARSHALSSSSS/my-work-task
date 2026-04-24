const mongoose = require('mongoose');

const locationPointSchema = new mongoose.Schema(
    { lat: { type: Number, required: true }, lng: { type: Number, required: true } },
    { _id: false }
);

const stopSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        addressLine: { type: String, required: true },
        note: { type: String, default: '' },
        contactName: { type: String, default: '' },
        contactPhone: { type: String, default: '' },
        location: { type: locationPointSchema, required: true },
    },
    { _id: false }
);

const itemSchema = new mongoose.Schema(
    {
        itemId: { type: String, required: true },
        title: { type: String, required: true },
        subtitle: { type: String, default: '' },
        quantity: { type: Number, required: true, min: 1 },
        checkedAtPickup: { type: Boolean, default: false },
    },
    { _id: false }
);

const locationUpdateSchema = new mongoose.Schema(
    {
        at: { type: Date, default: Date.now },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        heading: { type: Number, default: 0 },
        speedKmph: { type: Number, default: 0 },
        etaMinutes: { type: Number, default: 0 },
        distanceKm: { type: Number, default: 0 },
    },
    { _id: false }
);

const historyEventSchema = new mongoose.Schema(
    {
        status: {
            type: String,
            enum: [
                'pending_assignment',
                'assigned',
                'arrived_pickup',
                'picked',
                'out_for_delivery',
                'delivered',
                'rejected',
                'failed',
                'sos',
            ],
            required: true,
        },
        note: { type: String, default: '' },
        at: { type: Date, default: Date.now },
    },
    { _id: false }
);

const routeSummarySchema = new mongoose.Schema(
    {
        provider: { type: String, default: '' },
        destinationType: { type: String, enum: ['', 'pickup', 'dropoff'], default: '' },
        polyline: { type: String, default: '' },
        durationSeconds: { type: Number, default: 0 },
        distanceMeters: { type: Number, default: 0 },
        nextInstruction: { type: String, default: '' },
        nextInstructionDistanceMeters: { type: Number, default: 0 },
        updatedAt: { type: Date, default: null },
        origin: { type: locationPointSchema, default: null },
        destination: { type: locationPointSchema, default: null },
    },
    { _id: false }
);

const STATUSES = [
    'pending_assignment',
    'assigned',
    'arrived_pickup',
    'picked',
    'out_for_delivery',
    'delivered',
    'rejected',
    'failed',
    'sos',
];

const deliveryTaskSchema = new mongoose.Schema(
    {
        orderId: { type: String, required: true, unique: true, index: true },
        customerId: { type: String, required: true, index: true },
        riderId: { type: String, default: '', index: true },
        activeAssignment: { type: Boolean, default: false, index: true },
        status: { type: String, enum: STATUSES, default: 'pending_assignment', index: true },
        pickup: { type: stopSchema, required: true },
        dropoff: { type: stopSchema, required: true },
        items: { type: [itemSchema], default: [] },
        specialInstructions: { type: String, default: '' },
        etaMinutes: { type: Number, default: 0 },
        distanceKm: { type: Number, default: 0 },
        estimatedPayout: { type: Number, default: 0.0 },
        weight: { type: Number, default: 0.0 },
        packageType: { type: String, default: '' },
        chatThreadId: { type: String, default: '' },
        route: { type: routeSummarySchema, default: () => ({}) },
        proofOfDelivery: {
            otp: { type: String, default: '' },
            photoUrl: { type: String, default: '' },
            confirmedAt: { type: Date, default: null },
            notes: { type: String, default: '' },
        },
        failureInfo: {
            reason: { type: String, default: '' },
            note: { type: String, default: '' },
            failedAt: { type: Date, default: null },
        },
        locationUpdates: { type: [locationUpdateSchema], default: [] },
        history: { type: [historyEventSchema], default: [] },
    },
    { timestamps: true }
);

deliveryTaskSchema.index({ riderId: 1, status: 1, updatedAt: -1 });
deliveryTaskSchema.index({ status: 1, updatedAt: -1 });
deliveryTaskSchema.index({ customerId: 1, updatedAt: -1 });

const DeliveryTask = mongoose.model('DeliveryTask', deliveryTaskSchema);
module.exports = { DeliveryTask };
