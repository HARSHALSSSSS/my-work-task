const mongoose = require('mongoose');

/**
 * Cart — stores items before checkout.
 * One cart per user (upserted).
 */
const cartItemSchema = new mongoose.Schema(
    {
        productId: { type: String, required: true },
        productName: { type: String, required: true },
        flowType: { type: String, enum: ['printing', 'gifting', 'shopping'], required: true },
        thumbnail: { type: String },

        // For document printing
        printConfigId: { type: String },

        // For business printing
        businessPrintConfigId: { type: String },

        // For gifting / shopping
        designId: { type: String },
        designName: { type: String },
        designPreview: { type: String },
        designJson: { type: mongoose.Schema.Types.Mixed },
        variantId: { type: String },
        variantIndex: { type: Number },
        variantSnapshot: { type: mongoose.Schema.Types.Mixed },
        productSlug: { type: String },
        sku: { type: String },
        mrp: { type: Number },
        salePrice: { type: Number },
        badge: { type: String },
        freeShipping: { type: Boolean, default: false },

        quantity: { type: Number, required: true, min: 1, default: 1 },
        unitPrice: { type: Number, required: true },
        totalPrice: { type: Number, required: true },
    },
    { _id: true, timestamps: true }
);

const cartSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, unique: true },
        items: { type: [cartItemSchema], default: [] },
        subtotal: { type: Number, default: 0 },
    },
    { timestamps: true }
);

// Recalculate subtotal before save
cartSchema.pre('save', function (next) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
    next();
});

module.exports = mongoose.model('Cart', cartSchema);
