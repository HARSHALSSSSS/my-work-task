const Joi = require('joi');

const objectId = Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .message('Invalid ObjectId');

const giftingVariantSchema = Joi.object({
    size: Joi.string().allow('').optional(),
    size_label: Joi.string().allow('').optional(),
    paper_type: Joi.string().allow('').optional(),
    cover_color: Joi.string().allow('').optional(),
    cover_color_name: Joi.string().allow('').optional(),
    stock: Joi.number().min(0).required(),
    additional_price: Joi.number().min(0).default(0),
});

const giftingOptionsSchema = Joi.object({
    materials: Joi.array().items(Joi.string()).default([]),
    sizes: Joi.array().items(Joi.string()).default([]),
    colors: Joi.array().items(Joi.string()).default([]),
    supports_photo_upload: Joi.boolean().default(false),
    supports_name_customization: Joi.boolean().default(false),
    supports_text_customization: Joi.boolean().default(false),
    max_photos: Joi.number().integer().min(0).default(1),
    max_name_length: Joi.number().integer().min(0).default(0),
    max_text_length: Joi.number().integer().min(0).default(0),
    allow_premium_templates: Joi.boolean().default(false),
    allow_blank_design: Joi.boolean().default(false),
    design_instructions: Joi.string().allow('').optional(),
    canvas: Joi.object({
        width: Joi.number().positive().required(),
        height: Joi.number().positive().required(),
        unit: Joi.string().valid('mm', 'cm', 'px', 'in').default('mm'),
    }).optional(),
});

const createGiftingProductSchema = Joi.object({
    name: Joi.string().min(2).max(200).required(),
    slug: Joi.string().lowercase().optional(),
    sku: Joi.string().max(100).optional(),
    category: objectId.required(),
    subcategory: objectId.optional().allow(null, ''),
    brand: Joi.string().max(100).allow('').optional(),
    description: Joi.string().max(5000).allow('').optional(),
    highlights: Joi.array().items(Joi.string()).default([]),
    mrp: Joi.number().min(0).required(),
    sale_price: Joi.number().min(0).max(Joi.ref('mrp')).required(),
    bulk_price: Joi.number().min(0).optional(),
    min_bulk_qty: Joi.number().integer().min(1).optional(),
    badge: Joi.string()
        .valid('sale', 'new', 'trending', 'bestseller', 'deal')
        .allow(null, '')
        .optional(),
    variants: Joi.array().items(giftingVariantSchema).default([]),
    gift_options: giftingOptionsSchema.default({}),
    images: Joi.array().items(Joi.string().uri()).default([]),
    thumbnail: Joi.string().uri().optional().allow('', null),
    design_mode: Joi.string().valid('premium', 'normal', 'both').optional().allow('', null),
    requires_design: Joi.boolean().optional(),
    requires_upload: Joi.boolean().optional(),
    is_active: Joi.boolean().default(true),
    is_featured: Joi.boolean().default(false),
    free_shipping: Joi.boolean().default(false),
    in_stock: Joi.boolean().optional(),
    sort_order: Joi.number().integer().default(0),
});

const updateGiftingProductSchema = createGiftingProductSchema.fork(
    ['name', 'category', 'mrp', 'sale_price'],
    (field) => field.optional()
);

const createGiftingCategorySchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    slug: Joi.string().lowercase().optional(),
    image: Joi.string().uri().optional().allow('', null),
    starting_from: Joi.number().min(0).optional(),
    sort_order: Joi.number().integer().default(0),
    is_active: Joi.boolean().default(true),
    description: Joi.string().max(500).allow('').optional(),
});

const updateGiftingCategorySchema = createGiftingCategorySchema.fork(['name'], (field) =>
    field.optional()
);

const internalResolveItemsSchema = Joi.object({
    items: Joi.array()
        .items(
            Joi.object({
                item_id: Joi.string().optional(),
                product_id: objectId.required(),
                variant_index: Joi.number().integer().min(0).optional().allow(null),
                qty: Joi.number().integer().min(1).required(),
            })
        )
        .min(1)
        .required(),
    strict_stock: Joi.boolean().default(false),
});

module.exports = {
    createGiftingProductSchema,
    updateGiftingProductSchema,
    createGiftingCategorySchema,
    updateGiftingCategorySchema,
    internalResolveItemsSchema,
};
