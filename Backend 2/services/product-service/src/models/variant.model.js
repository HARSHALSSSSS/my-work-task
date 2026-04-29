const mongoose = require('mongoose');

/**
 * Product variants (e.g., size/color combinations with individual pricing).
 */
const variantSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        name: { type: String, required: true, trim: true }, // e.g., "A4 - Color - Double Side"
        attributes: { type: Map, of: String }, // { size: 'A4', color: 'Color' }
        price: { type: Number, required: true, min: 0 },
        stock: { type: Number, default: 0 },
        sku: { type: String, trim: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

variantSchema.index({ product: 1 });

module.exports = mongoose.model('Variant', variantSchema);
