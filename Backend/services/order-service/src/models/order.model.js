const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    variantId: { type: String },
    variantIndex: { type: Number },
    variantSnapshot: { type: mongoose.Schema.Types.Mixed },
    flowType: { type: String, enum: ['printing', 'gifting', 'shopping'], required: true },
    productSlug: { type: String },
    sku: { type: String },
    thumbnail: { type: String },
    mrp: { type: Number },
    salePrice: { type: Number },
    badge: { type: String },

    // Printing-specific
    printConfig: {
        paperSize: String,
        paperType: String,
        colorOption: String,
        bindingType: String,
        sides: String,
        copies: { type: Number, default: 1 },
        pages: Number,
    },

    // Reference to saved PrintConfig document (document printing flow)
    printConfigId: { type: String },

    // Reference to saved BusinessPrintConfig document (business printing flow)
    businessPrintConfigId: { type: String },

    // Design reference (gifting / business printing)
    designId: { type: String },

    // Upload reference (document printing)
    uploadedFileUrl: { type: String },

    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
});

const orderSchema = new mongoose.Schema(
    {
        orderNumber: { type: String, unique: true },
        userId: { type: String, required: true },

        items: [orderItemSchema],

        // Address snapshot (not a ref — snapshot at order time)
        shippingAddress: {
            fullName: String,
            phone: String,
            line1: String,
            line2: String,
            city: String,
            state: String,
            pincode: String,
            country: { type: String, default: 'India' },
            location: {
                lat: Number,
                lng: Number,
                accuracyMeters: Number,
                source: String,
                capturedAt: Date,
            },
        },

        status: {
            type: String,
            enum: [
                'pending', // order placed, payment pending
                'confirmed', // payment received
                'assigned_vendor', // vendor assigned by system/admin
                'vendor_accepted', // vendor confirmed the order
                'in_production', // vendor started production
                'qc_pending', // quality check in progress
                'ready_for_pickup', // ready for delivery partner pickup
                'delivery_assigned', // delivery partner assigned
                'out_for_delivery', // rider picked up, en route
                'delivered', // delivered to customer
                'cancelled', // cancelled by customer/admin
                'refunded', // refund processed
            ],
            default: 'pending',
        },

        paymentStatus: {
            type: String,
            enum: ['unpaid', 'paid', 'refunded', 'failed'],
            default: 'unpaid',
        },

        paymentId: { type: String },

        // Vendor assignment
        vendorId: { type: String, default: '' },
        storeId: { type: String, default: '' },

        // Delivery tracking
        riderId: { type: String, default: '' },
        deliveryStatus: { type: String, default: '' },
        deliveryEtaMinutes: { type: Number, default: 0 },
        deliveryDistanceKm: { type: Number, default: 0 },
        customerFacingStatus: { type: String, default: 'Order placed' },

        // Lifecycle timestamps
        assignedAt: { type: Date },
        acceptedAt: { type: Date },
        productionStartedAt: { type: Date },
        qcAt: { type: Date },
        readyAt: { type: Date },
        deliveredAt: { type: Date },
        cancelledAt: { type: Date },

        // Refund
        refundId: { type: String },

        // For pickup orders
        pickupShopId: { type: String },

        subtotal: { type: Number, required: true },
        discount: { type: Number, default: 0 },
        deliveryCharge: { type: Number, default: 0 },
        total: { type: Number, required: true },

        notes: { type: String },
        failureReason: { type: String, default: '' },

        couponCode: { type: String, default: '' },
        assignmentHistory: [
            {
                vendorId: { type: String, default: '' },
                storeId: { type: String, default: '' },
                assignedBy: { type: String, default: 'system' },
                reason: { type: String, default: '' },
                assignedAt: { type: Date, default: Date.now },
            },
        ],
        clarification: {
            isRequired: { type: Boolean, default: false },
            status: {
                type: String,
                enum: ['none', 'requested', 'responded', 'resolved', 'expired'],
                default: 'none',
            },
            requestedByRole: { type: String, default: '' },
            question: { type: String, default: '' },
            response: { type: String, default: '' },
            requestedAt: { type: Date, default: null },
            respondedAt: { type: Date, default: null },
            dueAt: { type: Date, default: null },
        },
        editWindow: {
            isEditable: { type: Boolean, default: true },
            editableUntil: { type: Date, default: null },
            lockedReason: { type: String, default: '' },
        },

        // Timeline of status changes
        timeline: [
            {
                status: String,
                note: String,
                timestamp: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: true }
);

// Auto-generate order number
orderSchema.pre('save', async function (next) {
    if (!this.orderNumber) {
        const count = await mongoose.model('Order').countDocuments();
        this.orderNumber = `SC${Date.now()}${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

orderSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Order', orderSchema);
