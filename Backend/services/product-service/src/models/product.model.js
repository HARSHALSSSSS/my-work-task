const mongoose = require('mongoose');

/**
 * Unified product model for Printing, Gifting, and Shopping.
 * flowType drives the frontend/order flow.
 */
const shoppingVariantSchema = new mongoose.Schema(
    {
        size: { type: String, trim: true, default: '' },
        size_label: { type: String, trim: true, default: '' },
        paper_type: { type: String, trim: true, default: '' },
        cover_color: { type: String, trim: true, default: '' },
        cover_color_name: { type: String, trim: true, default: '' },
        stock: { type: Number, default: 0, min: 0 },
        additional_price: { type: Number, default: 0, min: 0 },
    },
    { _id: false }
);

const shoppingSpecsSchema = new mongoose.Schema(
    {
        paper_weight: { type: String, trim: true, default: '' },
        page_count: { type: String, trim: true, default: '' },
        cover_material: { type: String, trim: true, default: '' },
        binding: { type: String, trim: true, default: '' },
        extras: { type: String, trim: true, default: '' },
        features: [{ type: String, trim: true }],
    },
    { _id: false }
);

const productSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        slug: { type: String, required: true, lowercase: true },
        description: { type: String, trim: true },

        // ─── Category Hierarchy ──────────────────────────────
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: true,
        },
        subcategory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subcategory',
        },

        // ─── Flow Control ────────────────────────────────────
        flowType: {
            type: String,
            enum: ['printing', 'gifting', 'shopping'],
            required: true,
        },
        requiresDesign: { type: Boolean, default: false },
        requiresUpload: { type: Boolean, default: false },

        // ─── Business Printing specific ──────────────────────
        // Sub-type within business printing
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
                '',
            ],
            default: '',
        },
        // Design mode for business printing products
        designMode: {
            type: String,
            enum: ['premium', 'normal', 'both', ''],
            default: '',
        },

        // ─── Pricing ─────────────────────────────────────────
        basePrice: { type: Number, required: true, min: 0 },
        discountedPrice: { type: Number, min: 0 },
        currency: { type: String, default: 'INR' },

        // ─── Media ───────────────────────────────────────────
        images: [{ type: String }],
        thumbnail: { type: String },

        // ─── Printing-specific ───────────────────────────────
        printOptions: {
            paperSizes: [{ type: String }], // A4, A3, Letter, etc.
            paperTypes: [{ type: String }], // Bond, Glossy, Matte
            colorOptions: [{ type: String }], // BW, Color
            bindingTypes: [{ type: String }], // Spiral, Soft, Hard
            sides: [{ type: String }], // Single, Double
        },

        // ─── Gifting-specific ────────────────────────────────
        giftOptions: {
            materials: [{ type: String }],
            sizes: [{ type: String }],
            colors: [{ type: String }],
            supportsPhotoUpload: { type: Boolean, default: false },
            supportsNameCustomization: { type: Boolean, default: false },
            supportsTextCustomization: { type: Boolean, default: false },
            maxPhotos: { type: Number, default: 1, min: 0 },
            maxNameLength: { type: Number, default: 0, min: 0 },
            maxTextLength: { type: Number, default: 0, min: 0 },
            allowPremiumTemplates: { type: Boolean, default: false },
            allowBlankDesign: { type: Boolean, default: false },
            designInstructions: { type: String, trim: true, default: '' },
            canvas: {
                width: { type: Number },
                height: { type: Number },
                unit: { type: String, default: 'mm' },
            },
        },

        // ─── Shopping-specific ───────────────────────────────
        stock: { type: Number, default: 0 },
        sku: { type: String, trim: true },
        brand: { type: String, trim: true },
        tags: [{ type: String }],
        highlights: [{ type: String, trim: true }],
        mrp: { type: Number, min: 0 },
        sale_price: { type: Number, min: 0 },
        bulk_price: { type: Number, min: 0 },
        min_bulk_qty: { type: Number, min: 1 },
        badge: {
            type: String,
            enum: ['sale', 'new', 'trending', 'bestseller', 'deal', null],
            default: null,
        },
        is_deal_of_day: { type: Boolean, default: false },
        deal_expires_at: { type: Date },
        variants: { type: [shoppingVariantSchema], default: [] },
        specs: { type: shoppingSpecsSchema, default: () => ({}) },
        free_shipping: { type: Boolean, default: false },
        in_stock: { type: Boolean, default: true },
        created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },

        // ─── Status ──────────────────────────────────────────
        isActive: { type: Boolean, default: true },
        isFeatured: { type: Boolean, default: false },
        sortOrder: { type: Number, default: 0 },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

productSchema.index({ category: 1, flowType: 1 });
productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ sku: 1 }, { unique: true, sparse: true });
productSchema.index({ tags: 1 });

productSchema.virtual('discount_pct').get(function () {
    if (!this.mrp || !this.sale_price || this.mrp <= 0 || this.sale_price >= this.mrp) return 0;
    return Math.round(((this.mrp - this.sale_price) / this.mrp) * 100);
});

productSchema.pre('validate', function (next) {
    if (['shopping', 'gifting'].includes(this.flowType)) {
        if (typeof this.mrp === 'number') this.basePrice = this.mrp;
        if (typeof this.sale_price === 'number') this.discountedPrice = this.sale_price;
        else if (typeof this.mrp === 'number') this.discountedPrice = this.mrp;

        if (!this.thumbnail && Array.isArray(this.images) && this.images.length) {
            this.thumbnail = this.images[0];
        }

        if (Array.isArray(this.variants) && this.variants.length) {
            this.stock = this.variants.reduce((sum, variant) => sum + (variant.stock || 0), 0);
            this.in_stock = this.variants.some((variant) => (variant.stock || 0) > 0);
        } else if (this.flowType === 'shopping') {
            this.in_stock = this.stock > 0;
        }
    }

    next();
});

module.exports = mongoose.model('Product', productSchema);
