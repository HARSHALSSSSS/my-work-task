const Joi = require('joi');

const saveBusinessPrintConfigSchema = Joi.object({
    productId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required(),
    productName: Joi.string().required(),
    businessPrintType: Joi.string()
        .valid(
            'business_card',
            'flyers',
            'leaflets',
            'brochures',
            'posters',
            'letterheads',
            'custom_stationery'
        )
        .required(),

    // Design type: premium (template-based) or normal (blank canvas)
    designType: Joi.string().valid('premium', 'normal').required(),

    // ID of the saved design from design-service
    designId: Joi.string().required(),

    // Preview image of the finalized design
    previewImage: Joi.string().optional(),

    // Product options
    selectedOptions: Joi.object({
        size: Joi.string().optional(),
        paperType: Joi.string().optional(),
        finish: Joi.string().optional(),
        sides: Joi.string().optional(),
    }).optional(),

    quantity: Joi.number().integer().min(1).required(),
    unitPrice: Joi.number().min(0).required(),
    totalPrice: Joi.number().min(0).required(),

    // Delivery
    deliveryMethod: Joi.string().valid('pickup', 'delivery').required(),
    shopId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .when('deliveryMethod', {
            is: 'pickup',
            then: Joi.required(),
            otherwise: Joi.optional(),
        }),
    servicePackage: Joi.string()
        .valid('standard', 'express', 'instant', '')
        .when('deliveryMethod', {
            is: 'delivery',
            then: Joi.required(),
            otherwise: Joi.optional(),
        }),
});

module.exports = { saveBusinessPrintConfigSchema };
