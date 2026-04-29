const mongoose = require('mongoose');

const designSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true },
        productId: { type: String, required: true },
        name: { type: String, default: 'Untitled Design', trim: true },

        canvasJson: { type: mongoose.Schema.Types.Mixed, required: true },

        previewImage: { type: String },

        flowType: {
            type: String,
            enum: ['gifting', 'business_printing', 'shopping'],
            required: true,
        },

        designType: {
            type: String,
            enum: ['premium', 'normal'],
            default: 'normal',
        },

        templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Template' },

        dimensions: {
            width: { type: Number },
            height: { type: Number },
            unit: { type: String, default: 'mm' },
        },

        isFinalized: { type: Boolean, default: false },
        isSaved: { type: Boolean, default: true },
        lastApprovedOrderId: { type: String, default: '' },
    },
    { timestamps: true }
);

designSchema.index({ userId: 1, productId: 1 });
designSchema.index({ userId: 1, flowType: 1 });

module.exports = mongoose.model('Design', designSchema);
