const Joi = require('joi');

const objectId = Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .message('Invalid ObjectId');

const createProductSchema = Joi.object({
    name: Joi.string().min(2).max(200).required(),
    slug: Joi.string().lowercase().optional(),
    description: Joi.string().max(2000).optional(),

    // Category refs — must exist in DB
    category: objectId.required(),
    subcategory: objectId.optional(),

    // Flow control
    flowType: Joi.string().valid('printing', 'gifting', 'shopping').required(),
    requiresDesign: Joi.boolean().default(false),
    requiresUpload: Joi.boolean().default(false),

    // Pricing
    basePrice: Joi.number().min(0).required(),
    discountedPrice: Joi.number().min(0).optional(),
    currency: Joi.string().default('INR'),

    // Media
    images: Joi.array().items(Joi.string()).optional(),
    thumbnail: Joi.string().optional(),

    // Printing options
    printOptions: Joi.object({
        paperSizes: Joi.array().items(Joi.string()),
        paperTypes: Joi.array().items(Joi.string()),
        colorOptions: Joi.array().items(Joi.string()),
        bindingTypes: Joi.array().items(Joi.string()),
        sides: Joi.array().items(Joi.string()),
    }).optional(),

    // Gifting options
    giftOptions: Joi.object({
        materials: Joi.array().items(Joi.string()),
        sizes: Joi.array().items(Joi.string()),
        colors: Joi.array().items(Joi.string()),
        supportsPhotoUpload: Joi.boolean().default(false),
        supportsNameCustomization: Joi.boolean().default(false),
        supportsTextCustomization: Joi.boolean().default(false),
        maxPhotos: Joi.number().integer().min(0).default(1),
        maxNameLength: Joi.number().integer().min(0).default(0),
        maxTextLength: Joi.number().integer().min(0).default(0),
        allowPremiumTemplates: Joi.boolean().default(false),
        allowBlankDesign: Joi.boolean().default(false),
        designInstructions: Joi.string().allow('').optional(),
        canvas: Joi.object({
            width: Joi.number().positive().required(),
            height: Joi.number().positive().required(),
            unit: Joi.string().valid('mm', 'cm', 'px', 'in').default('mm'),
        }).optional(),
    }).optional(),

    // Shopping
    stock: Joi.number().min(0).default(0),
    sku: Joi.string().optional(),
    brand: Joi.string().optional(),
    tags: Joi.array().items(Joi.string()).optional(),

    isFeatured: Joi.boolean().default(false),
    sortOrder: Joi.number().default(0),
});

const updateProductSchema = createProductSchema.fork(
    ['name', 'category', 'flowType', 'basePrice'],
    (f) => f.optional()
);

module.exports = { createProductSchema, updateProductSchema };
