const successResponse = (data) => ({ success: true, data });
const errorResponse = (message, details) => ({
    success: false,
    error: { message, details: details ?? null },
});
module.exports = { successResponse, errorResponse };
