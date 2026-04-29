const Joi = require('joi');

const objectId = Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .message('Invalid ObjectId');

const shoppingVariantSchema = Joi.object({
    size: Joi.string().allow('').optional(),
    size_label: Joi.string().allow('').optional(),
    paper_type: Joi.string().allow('').optional(),
    cover_color: Joi.string().allow('').optional(),
    cover_color_name: Joi.string().allow('').optional(),
    stock: Joi.number().min(0).required(),
    additional_price: Joi.number().min(0).default(0),
});

const shoppingSpecsSchema = Joi.object({
    paper_weight: Joi.string().allow('').optional(),
    page_count: Joi.alternatives().try(Joi.string().allow(''), Joi.number().min(0)).optional(),
    cover_material: Joi.string().allow('').optional(),
    binding: Joi.string().allow('').optional(),
    extras: Joi.string().allow('').optional(),
    features: Joi.array().items(Joi.string()).default([]),
});

const createShoppingProductSchema = Joi.object({
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
    is_deal_of_day: Joi.boolean().default(false),
    deal_expires_at: Joi.date().iso().optional().allow(null),
    variants: Joi.array().items(shoppingVariantSchema).default([]),
    specs: shoppingSpecsSchema.default({}),
    images: Joi.array().items(Joi.string().uri()).default([]),
    thumbnail: Joi.string().uri().optional().allow('', null),
    is_active: Joi.boolean().default(true),
    is_featured: Joi.boolean().default(false),
    free_shipping: Joi.boolean().default(false),
    in_stock: Joi.boolean().optional(),
    sort_order: Joi.number().integer().default(0),
});

const updateShoppingProductSchema = createShoppingProductSchema.fork(
    ['name', 'category', 'mrp', 'sale_price'],
    (field) => field.optional()
);

const createShoppingCategorySchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    slug: Joi.string().lowercase().optional(),
    image: Joi.string().uri().optional().allow('', null),
    starting_from: Joi.number().min(0).optional(),
    sort_order: Joi.number().integer().default(0),
    is_active: Joi.boolean().default(true),
    description: Joi.string().max(500).allow('').optional(),
});

const updateShoppingCategorySchema = createShoppingCategorySchema.fork(['name'], (field) =>
    field.optional()
);

const patchDealSchema = Joi.object({
    is_deal_of_day: Joi.boolean().required(),
    deal_expires_at: Joi.date()
        .iso()
        .allow(null)
        .when('is_deal_of_day', {
            is: true,
            then: Joi.required(),
            otherwise: Joi.optional(),
        }),
});

const bannerSchema = Joi.object({
    title: Joi.string().min(2).max(200).required(),
    subtitle: Joi.string().allow('').optional(),
    cta_text: Joi.string().allow('').optional(),
    cta_link: Joi.string().allow('').optional(),
    image: Joi.string().uri().required(),
    bg_color: Joi.string().pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).allow('').optional(),
    placement: Joi.string().valid('home_hero', 'list_top', 'deal_strip').required(),
    section: Joi.string().valid('shopping', 'gifting', 'printing', 'all').default('all'),
    is_active: Joi.boolean().default(true),
    starts_at: Joi.date().iso().optional().allow(null),
    ends_at: Joi.date().iso().optional().allow(null),
});

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
    createShoppingProductSchema,
    updateShoppingProductSchema,
    createShoppingCategorySchema,
    updateShoppingCategorySchema,
    patchDealSchema,
    bannerSchema,
    internalResolveItemsSchema,
};
