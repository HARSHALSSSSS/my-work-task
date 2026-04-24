const Joi = require('joi');

const savePrintConfigSchema = Joi.object({
    printType: Joi.string()
        .valid('standard_printing', 'soft_binding', 'spiral_binding', 'thesis_binding')
        .required(),

    // Files — array of uploaded file objects
    files: Joi.array()
        .items(
            Joi.object({
                originalName: Joi.string().required(),
                url: Joi.string().required(),
                publicId: Joi.string().allow(null, '').optional(),
                size: Joi.number().optional(),
                pages: Joi.number().optional(),
                mimeType: Joi.string().optional(),
            })
        )
        .min(1)
        .required(),

    // Common
    colorMode: Joi.string().valid('bw', 'color', 'custom').required(),
    pageSize: Joi.string().valid('a4', 'a3', 'letter').default('a4'),
    printSide: Joi.string().valid('one_sided', 'two_sided', '4in1').default('one_sided'),
    copies: Joi.number().integer().min(1).default(1),
    linearGraphSheets: Joi.number().integer().min(0).default(0),
    semiLogGraphSheets: Joi.number().integer().min(0).default(0),
    specialInstructions: Joi.string().max(500).allow('').optional(),

    // Standard printing only
    printOutputType: Joi.string()
        .valid('loose_paper', 'stapled', '')
        .when('printType', {
            is: 'standard_printing',
            then: Joi.required(),
            otherwise: Joi.optional(),
        }),

    // Soft binding only
    coverPage: Joi.string()
        .valid(
            'transparent_sheet',
            'blue_cover',
            'pink_cover',
            'print_blue_cover',
            'print_pink_cover',
            ''
        )
        .when('printType', {
            is: 'soft_binding',
            then: Joi.required(),
            otherwise: Joi.optional(),
        }),

    // Thesis binding only
    bindingCover: Joi.string()
        .valid('black_gold', 'silver', 'silver_side_strip', 'black_gold_side_strip', '')
        .when('printType', {
            is: 'thesis_binding',
            then: Joi.required(),
            otherwise: Joi.optional(),
        }),
    cdRequired: Joi.string()
        .valid('need', 'no_need', '')
        .when('printType', {
            is: 'thesis_binding',
            then: Joi.required(),
            otherwise: Joi.optional(),
        }),

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

module.exports = { savePrintConfigSchema };
