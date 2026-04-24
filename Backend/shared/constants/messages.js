const MESSAGES = {
    // Auth
    SIGNUP_SUCCESS: 'Account created successfully',
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logged out successfully',
    INVALID_CREDENTIALS: 'Invalid email or password',
    EMAIL_EXISTS: 'Email already registered',
    UNAUTHORIZED: 'Unauthorized access',
    TOKEN_EXPIRED: 'Token has expired',
    TOKEN_INVALID: 'Invalid token',

    // General
    NOT_FOUND: 'Resource not found',
    SERVER_ERROR: 'Internal server error',
    VALIDATION_ERROR: 'Validation failed',
    SUCCESS: 'Success',
    CREATED: 'Created successfully',
    UPDATED: 'Updated successfully',
    DELETED: 'Deleted successfully',

    // Product
    PRODUCT_NOT_FOUND: 'Product not found',
    CATEGORY_NOT_FOUND: 'Category not found',

    // Order
    ORDER_NOT_FOUND: 'Order not found',
    ORDER_CREATED: 'Order placed successfully',

    // Payment
    PAYMENT_INITIATED: 'Payment initiated',
    PAYMENT_VERIFIED: 'Payment verified successfully',
    PAYMENT_FAILED: 'Payment verification failed',
};

module.exports = MESSAGES;
