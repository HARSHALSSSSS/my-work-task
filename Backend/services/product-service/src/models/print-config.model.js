const mongoose = require('mongoose');

/**
 * Saved print configuration — created when user configures their print job.
 * Referenced by order-service when placing the order.
 */
const uploadedFileSchema = new mongoose.Schema(
    {
        originalName: { type: String, required: true },
        url: { type: String, required: true }, // Cloudinary URL or local path
        publicId: { type: String }, // Cloudinary public_id
        size: { type: Number }, // bytes
        pages: { type: Number, default: 0 },
        mimeType: { type: String },
    },
    { _id: false }
);

const printConfigSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true },

        // Which print type was selected
        printType: {
            type: String,
            enum: ['standard_printing', 'soft_binding', 'spiral_binding', 'thesis_binding'],
            required: true,
        },

        // Uploaded files
        files: { type: [uploadedFileSchema], default: [] },

        // ─── Common options ───────────────────────────────────
        colorMode: {
            type: String,
            enum: ['bw', 'color', 'custom'],
            required: true,
        },
        pageSize: {
            type: String,
            enum: ['a4', 'a3', 'letter'],
            default: 'a4',
        },
        printSide: {
            type: String,
            enum: ['one_sided', 'two_sided', '4in1'],
            default: 'one_sided',
        },
        copies: { type: Number, default: 1, min: 1 },
        linearGraphSheets: { type: Number, default: 0 },
        semiLogGraphSheets: { type: Number, default: 0 },
        specialInstructions: { type: String, default: '' },

        // ─── Standard Printing only ───────────────────────────
        printOutputType: {
            type: String,
            enum: ['loose_paper', 'stapled', ''],
            default: '',
        },

        // ─── Soft Binding only ────────────────────────────────
        coverPage: {
            type: String,
            enum: [
                'transparent_sheet',
                'blue_cover',
                'pink_cover',
                'print_blue_cover',
                'print_pink_cover',
                '',
            ],
            default: '',
        },

        // ─── Spiral Binding only ──────────────────────────────
        // (uses coverPage + printSide, no extra fields)

        // ─── Thesis Binding only ──────────────────────────────
        bindingCover: {
            type: String,
            enum: ['black_gold', 'silver', 'silver_side_strip', 'black_gold_side_strip', ''],
            default: '',
        },
        cdRequired: {
            type: String,
            enum: ['need', 'no_need', ''],
            default: '',
        },

        // ─── Delivery method ─────────────────────────────────
        deliveryMethod: {
            type: String,
            enum: ['pickup', 'delivery'],
            required: true,
        },

        // If pickup — selected shop
        shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },

        // If delivery — selected package
        servicePackage: {
            type: String,
            enum: ['standard', 'express', 'instant', ''],
            default: '',
        },

        // Calculated price
        estimatedPrice: { type: Number, default: 0 },

        // Status — pending until order is placed
        status: {
            type: String,
            enum: ['draft', 'ordered'],
            default: 'draft',
        },
    },
    { timestamps: true }
);

printConfigSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('PrintConfig', printConfigSchema);
