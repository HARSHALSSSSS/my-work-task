const Joi = require('joi');

const objectId = Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .message('Invalid ObjectId');

const paginationSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
});

module.exports = { objectId, paginationSchema };
