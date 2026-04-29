/**
 * Standardized API response helpers
 */

const sendSuccess = (res, data = {}, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};

const sendCreated = (res, data = {}, message = 'Created successfully') => {
    return sendSuccess(res, data, message, 201);
};

const sendError = (res, message = 'Internal server error', statusCode = 500, errors = null) => {
    const payload = { success: false, message };
    if (errors) payload.errors = errors;
    return res.status(statusCode).json(payload);
};

const sendNotFound = (res, message = 'Resource not found') => {
    return sendError(res, message, 404);
};

const sendUnauthorized = (res, message = 'Unauthorized') => {
    return sendError(res, message, 401);
};

const sendForbidden = (res, message = 'Forbidden') => {
    return sendError(res, message, 403);
};

const sendValidationError = (res, errors, message = 'Validation failed') => {
    return res.status(422).json({ success: false, message, errors });
};

module.exports = {
    sendSuccess,
    sendCreated,
    sendError,
    sendNotFound,
    sendUnauthorized,
    sendForbidden,
    sendValidationError,
};
