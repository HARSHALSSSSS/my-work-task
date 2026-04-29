const Joi = require('joi');

const createPaymentSchema = Joi.object({
    orderId: Joi.string().required(),
    amount: Joi.number().min(1).required(),
    currency: Joi.string().default('INR'),
});

const verifyPaymentSchema = Joi.object({
    razorpayOrderId: Joi.string().required(),
    razorpayPaymentId: Joi.string().required(),
    razorpaySignature: Joi.string().required(),
});

module.exports = { createPaymentSchema, verifyPaymentSchema };
