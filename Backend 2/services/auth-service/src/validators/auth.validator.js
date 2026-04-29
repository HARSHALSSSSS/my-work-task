const Joi = require('joi');

const verifyTokenSchema = Joi.object({
    role: Joi.string().valid('user', 'vendor', 'delivery_partner', 'admin', 'staff').default('user'),
});

const registerSchema = Joi.object({
    name: Joi.string().required().trim().min(2).max(100),
    email: Joi.string().email().required().lowercase().trim(),
    password: Joi.string().required().min(6).max(128),
    phone: Joi.string().optional().trim(),
    role: Joi.string().valid('user', 'vendor', 'delivery_partner').default('user'),
});

const adminRegisterSchema = Joi.object({
    name: Joi.string().required().trim().min(2).max(100),
    email: Joi.string().email().required().lowercase().trim(),
    password: Joi.string().required().min(6).max(128),
    phone: Joi.string().optional().trim(),
    role: Joi.string().valid('user', 'vendor', 'admin', 'staff', 'delivery_partner').default('user'),
});

const loginSchema = Joi.object({
    email: Joi.string().email().required().lowercase().trim(),
    password: Joi.string().required(),
});

const updateRoleSchema = Joi.object({
    role: Joi.string().valid('user', 'vendor', 'admin', 'staff', 'delivery_partner').required(),
});

const setStatusSchema = Joi.object({
    isActive: Joi.boolean().required(),
});

const sendPhoneOtpSchema = Joi.object({
    phone: Joi.string().trim().required(),
});

const verifyPhoneOtpSchema = Joi.object({
    phone: Joi.string().trim().required(),
    otp: Joi.string().trim().min(4).max(10).required(),
});

module.exports = {
    verifyTokenSchema,
    registerSchema,
    adminRegisterSchema,
    loginSchema,
    updateRoleSchema,
    setStatusSchema,
    sendPhoneOtpSchema,
    verifyPhoneOtpSchema,
};
