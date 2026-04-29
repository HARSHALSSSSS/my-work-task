const mongoose = require('mongoose');

/**
 * Business Print Configuration — saved when user configures a business printing product.
 * Stores product selection, design reference, quantity, and delivery method.
 */
const businessPrintConfigSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true },

        // Product selected (Business Card, Flyers, etc.)
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        productName: { type: String, required: true },
        businessPrintType: {
            type: String,
            enum: [
                'business_card',
                'flyers',
                'leaflets',
                'brochures',
                'posters',
                'letterheads',
                'custom_stationery',
            ],
            required: true,
        },

        // Design type chosen by user
        designType: {
            type: String,
            enum: ['premium', 'normal'],
            required: true,
        },

        // Reference to the saved design from design-service
        designId: { type: String, required: true },

        // Preview image of the final design
        previewImage: { type: String },

        // Product variant / size options
        selectedOptions: {
            size: { type: String }, // e.g., "Standard (3.5 x 2 in)", "A4", "A5"
            paperType: { type: String }, // Glossy, Matte, Premium
            finish: { type: String }, // Lamination, UV Coating, None
            sides: { type: String }, // Single-sided, Double-sided
        },

        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true },
        totalPrice: { type: Number, required: true },

        // Delivery method
        deliveryMethod: {
            type: String,
            enum: ['pickup', 'delivery'],
            required: true,
        },
        shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },
        servicePackage: {
            type: String,
            enum: ['standard', 'express', 'instant', ''],
            default: '',
        },

        status: {
            type: String,
            enum: ['draft', 'in_cart', 'ordered'],
            default: 'draft',
        },
    },
    { timestamps: true }
);

businessPrintConfigSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('BusinessPrintConfig', businessPrintConfigSchema);
