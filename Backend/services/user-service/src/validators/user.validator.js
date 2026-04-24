const Joi = require('joi');

const updateProfileSchema = Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    phone: Joi.string()
        .pattern(/^[0-9+\-\s]{7,15}$/)
        .optional(),
    avatar: Joi.string().uri().optional(),
    dateOfBirth: Joi.date().optional(),
    gender: Joi.string().valid('male', 'female', 'other').optional(),
    preferences: Joi.object({
        notifications: Joi.boolean(),
        newsletter: Joi.boolean(),
        push: Joi.boolean(),
        whatsapp: Joi.boolean(),
        criticalAlerts: Joi.boolean(),
        quietHours: Joi.object({
            start: Joi.string().allow(''),
            end: Joi.string().allow(''),
        }),
    }).optional(),
});

const notificationPreferencesSchema = Joi.object({
    push: Joi.boolean().optional(),
    whatsapp: Joi.boolean().optional(),
    notifications: Joi.boolean().optional(),
    newsletter: Joi.boolean().optional(),
    criticalAlerts: Joi.boolean().optional(),
    quietHours: Joi.object({
        start: Joi.string().allow('').optional(),
        end: Joi.string().allow('').optional(),
    }).optional(),
});

const privacyRequestSchema = Joi.object({
    reason: Joi.string().max(500).allow('').optional(),
});

const addressSchema = Joi.object({
    label: Joi.string().valid('Home', 'Office', 'Other').optional(),
    fullName: Joi.string().min(2).max(100).required(),
    phone: Joi.string()
        .pattern(/^[0-9+\-\s]{7,15}$/)
        .required(),
    houseNo: Joi.string().max(100).allow('').optional(),
    area: Joi.string().max(200).allow('').optional(),
    landmark: Joi.string().max(200).allow('').optional(),
    line1: Joi.string().min(5).max(200).required(),
    line2: Joi.string().max(200).optional(),
    city: Joi.string().min(2).max(100).required(),
    state: Joi.string().min(2).max(100).required(),
    pincode: Joi.string()
        .pattern(/^[0-9]{4,10}$/)
        .required(),
    country: Joi.string().default('India'),
    location: Joi.object({
        lat: Joi.number().optional(),
        lng: Joi.number().optional(),
    }).optional(),
    isDefault: Joi.boolean().default(false),
});

const addressLocationSchema = Joi.object({
    location: Joi.object({
        lat: Joi.number().required(),
        lng: Joi.number().required(),
        accuracyMeters: Joi.number().min(0).optional(),
        source: Joi.string().max(50).allow('').optional(),
        capturedAt: Joi.date().iso().optional(),
    }).required(),
});

module.exports = {
    updateProfileSchema,
    addressSchema,
    addressLocationSchema,
    notificationPreferencesSchema,
    privacyRequestSchema,
};
