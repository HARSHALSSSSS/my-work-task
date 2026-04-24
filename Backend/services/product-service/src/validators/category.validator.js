const Joi = require('joi');

const createCategorySchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    slug: Joi.string().lowercase().optional(),
    description: Joi.string().max(500).optional(),
    image: Joi.string().optional(),
    sortOrder: Joi.number().default(0),
});

const createSubcategorySchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    slug: Joi.string().lowercase().optional(),
    category: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required(),
    description: Joi.string().max(500).optional(),
    image: Joi.string().optional(),
    sortOrder: Joi.number().default(0),
});

module.exports = { createCategorySchema, createSubcategorySchema };
