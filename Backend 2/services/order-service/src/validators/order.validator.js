const Joi = require('joi');

const orderItemSchema = Joi.object({
    productId: Joi.string().required(),
    productName: Joi.string().required(),
    variantId: Joi.string().optional(),
    flowType: Joi.string().valid('printing', 'gifting', 'shopping').required(),

    // For document printing — reference to saved PrintConfig
    printConfigId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .optional(),

    // For business printing — reference to saved BusinessPrintConfig
    businessPrintConfigId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .optional(),

    // Legacy print config fields (kept for compatibility)
    printConfig: Joi.object({
        printType: Joi.string().valid(
            'standard_printing',
            'soft_binding',
            'spiral_binding',
            'thesis_binding'
        ),
        colorMode: Joi.string(),
        pageSize: Joi.string(),
        printSide: Joi.string(),
        copies: Joi.number().min(1),
        deliveryMethod: Joi.string().valid('pickup', 'delivery'),
        servicePackage: Joi.string().valid('standard', 'express', 'instant'),
        shopId: Joi.string(),
    }).optional(),

    designId: Joi.string().optional(),
    quantity: Joi.number().min(1).required(),
    unitPrice: Joi.number().min(0).required(),
    totalPrice: Joi.number().min(0).required(),
});

const createOrderSchema = Joi.object({
    items: Joi.array().items(orderItemSchema).min(1).required(),

    // Optional for pickup orders (no shipping needed)
    shippingAddress: Joi.object({
        fullName: Joi.string().allow('').optional(),
        phone: Joi.string().allow('').optional(),
        line1: Joi.string().allow('').optional(),
        line2: Joi.string().allow('').optional(),
        city: Joi.string().allow('').optional(),
        state: Joi.string().allow('').optional(),
        pincode: Joi.string().allow('').optional(),
        country: Joi.string().allow('').default('India'),
        location: Joi.object({
            lat: Joi.number().required(),
            lng: Joi.number().required(),
            accuracyMeters: Joi.number().min(0).optional(),
            source: Joi.string().allow('').optional(),
            capturedAt: Joi.date().iso().optional(),
        }).optional(),
    }).optional(),

    // For pickup orders
    pickupShopId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .optional(),

    subtotal: Joi.number().min(0).required(),
    discount: Joi.number().min(0).default(0),
    deliveryCharge: Joi.number().min(0).default(0),
    total: Joi.number().min(0).required(),
    couponCode: Joi.string().optional(),
    notes: Joi.string().max(500).optional(),
    paymentMethod: Joi.string().optional(),
});

module.exports = { createOrderSchema };
