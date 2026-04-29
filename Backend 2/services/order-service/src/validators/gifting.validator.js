const Joi = require('joi');

const objectId = Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .message('Invalid ObjectId');

const addToCartSchema = Joi.object({
    product_id: objectId.required(),
    design_id: Joi.string().trim().allow('', null).optional(),
    variant_index: Joi.number().integer().min(0).optional().allow(null),
    qty: Joi.number().integer().min(1).required(),
});

const createGiftingOrderSchema = Joi.object({
    cart_id: objectId.required(),
    address_id: objectId.required(),
    coupon_code: Joi.string().trim().allow('', null).optional(),
});

module.exports = {
    addToCartSchema,
    createGiftingOrderSchema,
};
