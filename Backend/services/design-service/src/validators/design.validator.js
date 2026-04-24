const Joi = require('joi');

const saveDesignSchema = Joi.object({
    productId: Joi.string().required(),
    name: Joi.string().max(100).optional(),
    canvasJson: Joi.object().required(),
    previewImage: Joi.string().optional(),
    flowType: Joi.string().valid('gifting', 'business_printing', 'shopping').required(),
    templateId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .optional(),
    isFinalized: Joi.boolean().default(false),
});

module.exports = { saveDesignSchema };
