const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        subtitle: { type: String, trim: true, default: '' },
        cta_text: { type: String, trim: true, default: '' },
        cta_link: { type: String, trim: true, default: '' },
        image: { type: String, required: true, trim: true },
        bg_color: { type: String, trim: true, default: '' },
        placement: {
            type: String,
            enum: ['home_hero', 'list_top', 'deal_strip'],
            required: true,
        },
        section: {
            type: String,
            enum: ['shopping', 'gifting', 'printing', 'all'],
            default: 'all',
        },
        is_active: { type: Boolean, default: true },
        starts_at: { type: Date },
        ends_at: { type: Date },
        created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    },
    { timestamps: true }
);

bannerSchema.index({ placement: 1, section: 1, is_active: 1 });

module.exports = mongoose.model('Banner', bannerSchema);
