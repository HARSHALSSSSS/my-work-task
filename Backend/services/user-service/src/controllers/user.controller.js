const userService = require('../services/user.service');
const { sendSuccess, sendCreated, sendError } = require('../../../../shared/utils/response');
const getUserId = (req) => req.headers['x-user-id'] || req.user?.id;

const getProfile = async (req, res, next) => {
    try {
        const userId = getUserId(req);
        if (!userId) return sendError(res, 'User ID not found', 400);

        const data = await userService.getOrCreateProfile(userId);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const userId = getUserId(req);
        if (!userId) return sendError(res, 'User ID not found', 400);

        const data = await userService.updateProfile(userId, req.body);
        return sendSuccess(res, data, 'Profile updated');
    } catch (err) {
        next(err);
    }
};

const getAddresses = async (req, res, next) => {
    try {
        const userId = getUserId(req);
        if (!userId) return sendError(res, 'User ID not found', 400);

        const data = await userService.getAddresses(userId);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const addAddress = async (req, res, next) => {
    try {
        const userId = getUserId(req);
        if (!userId) return sendError(res, 'User ID not found', 400);

        const data = await userService.addAddress(userId, req.body);
        return sendCreated(res, data, 'Address added');
    } catch (err) {
        next(err);
    }
};

const updateAddress = async (req, res, next) => {
    try {
        const userId = getUserId(req);
        if (!userId) return sendError(res, 'User ID not found', 400);

        const data = await userService.updateAddress(userId, req.params.id, req.body);
        return sendSuccess(res, data, 'Address updated');
    } catch (err) {
        next(err);
    }
};

const updateAddressLocation = async (req, res, next) => {
    try {
        const userId = getUserId(req);
        if (!userId) return sendError(res, 'User ID not found', 400);

        const data = await userService.updateAddressLocation(userId, req.params.id, req.body.location);
        return sendSuccess(res, data, 'Address location updated');
    } catch (err) {
        next(err);
    }
};

const deleteAddress = async (req, res, next) => {
    try {
        const userId = getUserId(req);
        if (!userId) return sendError(res, 'User ID not found', 400);

        await userService.deleteAddress(userId, req.params.id);
        return sendSuccess(res, null, 'Address deleted');
    } catch (err) {
        next(err);
    }
};

const updateNotificationPreferences = async (req, res, next) => {
    try {
        const userId = getUserId(req);
        if (!userId) return sendError(res, 'User ID not found', 400);

        const data = await userService.updateNotificationPreferences(userId, req.body);
        return sendSuccess(res, data, 'Notification preferences updated');
    } catch (err) {
        next(err);
    }
};

const requestDataExport = async (req, res, next) => {
    try {
        const userId = getUserId(req);
        if (!userId) return sendError(res, 'User ID not found', 400);

        const data = await userService.requestDataExport(userId);
        return sendSuccess(res, data, 'Data export requested');
    } catch (err) {
        next(err);
    }
};

const requestAccountDeletion = async (req, res, next) => {
    try {
        const userId = getUserId(req);
        if (!userId) return sendError(res, 'User ID not found', 400);

        const data = await userService.requestAccountDeletion(userId, req.body.reason);
        return sendSuccess(res, data, 'Account deletion requested');
    } catch (err) {
        next(err);
    }
};

const uploadAvatar = async (req, res, next) => {
    try {
        const userId = getUserId(req);
        if (!userId) return sendError(res, 'User ID not found', 400);
        if (!req.file) return sendError(res, 'Avatar file is required', 400);

        const avatar = `${req.protocol}://${req.get('host')}/uploads/users/avatars/${req.file.filename}`;
        const data = await userService.updateProfile(userId, { avatar });
        return sendSuccess(res, data, 'Avatar uploaded');
    } catch (err) {
        next(err);
    }
};

const getWishlist = async (req, res, next) => {
    try {
        const userId = getUserId(req);
        if (!userId) return sendError(res, 'User ID not found', 400);
        const data = await userService.getWishlist(userId);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const addToWishlist = async (req, res, next) => {
    try {
        const userId = getUserId(req);
        if (!userId) return sendError(res, 'User ID not found', 400);
        const { productId, productType } = req.body;
        if (!productId) return sendError(res, 'productId is required', 400);
        const data = await userService.addToWishlist(userId, productId, productType);
        return sendSuccess(res, data, 'Added to wishlist');
    } catch (err) {
        next(err);
    }
};

const removeFromWishlist = async (req, res, next) => {
    try {
        const userId = getUserId(req);
        if (!userId) return sendError(res, 'User ID not found', 400);
        const data = await userService.removeFromWishlist(userId, req.params.productId);
        return sendSuccess(res, data, 'Removed from wishlist');
    } catch (err) {
        next(err);
    }
};

const clearWishlist = async (req, res, next) => {
    try {
        const userId = getUserId(req);
        if (!userId) return sendError(res, 'User ID not found', 400);
        const data = await userService.clearWishlist(userId);
        return sendSuccess(res, data, 'Wishlist cleared');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getProfile,
    updateProfile,
    getAddresses,
    addAddress,
    updateAddress,
    updateAddressLocation,
    deleteAddress,
    updateNotificationPreferences,
    requestDataExport,
    requestAccountDeletion,
    uploadAvatar,
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
};
