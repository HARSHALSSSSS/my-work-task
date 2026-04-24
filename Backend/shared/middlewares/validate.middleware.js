const { sendValidationError } = require('../utils/response');

/**
 * Joi validation middleware factory.
 * Usage: validate(schema) — validates req.body by default.
 * validate(schema, 'query') — validates req.query.
 */
const validate =
    (schema, source = 'body') =>
    (req, res, next) => {
        const { error, value } = schema.validate(req[source], {
            abortEarly: false,
            stripUnknown: true,
        });
        if (error) {
            const errors = error.details.map((d) => d.message);
            console.error('[Validation Error]', errors);
            return sendValidationError(res, errors);
        }
        req[source] = value;
        next();
    };

module.exports = validate;
