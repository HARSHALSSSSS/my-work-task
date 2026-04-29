const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },

        category: { type: String, required: true },

        flowType: {
            type: String,
            enum: ['gifting', 'business_printing', 'shopping'],
            required: true,
        },

        isPremium: { type: Boolean, default: false },

        productId: { type: String },

        canvasJson: { type: mongoose.Schema.Types.Mixed, required: true },
        previewImage: { type: String },

        dimensions: {
            width: { type: Number },
            height: { type: Number },
            unit: { type: String, default: 'mm' },
        },

        isActive: { type: Boolean, default: true },
        tags: [{ type: String }],
        sortOrder: { type: Number, default: 0 },
    },
    { timestamps: true }
);

templateSchema.index({ category: 1, flowType: 1, isPremium: 1 });
templateSchema.index({ productId: 1 });

module.exports = mongoose.model('Template', templateSchema);
