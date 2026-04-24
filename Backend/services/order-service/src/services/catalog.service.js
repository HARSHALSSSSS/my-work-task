const config = require('../config');

const createError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const parseResponse = async (response) => {
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
        throw createError(payload?.message || 'Service request failed', response.status || 500);
    }

    return payload.data;
};

const resolveCatalogItems = async (flowType, items, strictStock = false) => {
    const response = await fetch(
        `${config.productServiceUrl}/api/internal/${flowType}/items/resolve`,
        {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-internal-token': config.internalServiceToken,
        },
        body: JSON.stringify({
            items,
            strict_stock: strictStock,
        }),
        }
    );

    return parseResponse(response);
};

const getUserAddresses = async (userId) => {
    const response = await fetch(`${config.userServiceUrl}/api/users/addresses`, {
        headers: {
            'x-user-id': userId,
        },
    });

    return parseResponse(response);
};

const saveUserAddress = async (userId, address) => {
    const response = await fetch(`${config.userServiceUrl}/api/users/addresses`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
        },
        body: JSON.stringify(address),
    });

    return parseResponse(response);
};

module.exports = {
    resolveCatalogItems,
    getUserAddresses,
    saveUserAddress,
};
