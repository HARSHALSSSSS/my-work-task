const Profile = require('../models/profile.model');
const Address = require('../models/address.model');
const config = require('../config');

const getOrCreateProfile = async (userId) => {
    let profile = await Profile.findOne({ userId });
    if (!profile) profile = await Profile.create({ userId });
    return profile;
};

const updateProfile = async (userId, data) => {
    return Profile.findOneAndUpdate({ userId }, data, {
        new: true,
        upsert: true,
        runValidators: true,
    });
};

const getAddresses = async (userId) => {
    return Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
};

const addAddress = async (userId, data) => {
    // If new address is default, unset others
    if (data.isDefault) {
        await Address.updateMany({ userId }, { isDefault: false });
    }
    return Address.create({ ...data, userId });
};

const updateAddress = async (userId, addressId, data) => {
    if (data.isDefault) {
        await Address.updateMany({ userId }, { isDefault: false });
    }
    const address = await Address.findOneAndUpdate({ _id: addressId, userId }, data, {
        new: true,
        runValidators: true,
    });
    if (!address) {
        const err = new Error('Address not found');
        err.statusCode = 404;
        throw err;
    }
    return address;
};

const updateAddressLocation = async (userId, addressId, location) => {
    const address = await Address.findOneAndUpdate(
        { _id: addressId, userId },
        {
            $set: {
                location: {
                    lat: Number(location.lat),
                    lng: Number(location.lng),
                    ...(location.accuracyMeters !== undefined ? { accuracyMeters: Number(location.accuracyMeters) } : {}),
                    ...(location.source ? { source: String(location.source).trim() } : {}),
                    capturedAt: location.capturedAt ? new Date(location.capturedAt) : new Date(),
                },
            },
        },
        { new: true, runValidators: true }
    );

    if (!address) {
        const err = new Error('Address not found');
        err.statusCode = 404;
        throw err;
    }

    return address;
};

const deleteAddress = async (userId, addressId) => {
    const address = await Address.findOneAndDelete({ _id: addressId, userId });
    if (!address) {
        const err = new Error('Address not found');
        err.statusCode = 404;
        throw err;
    }
    return address;
};

const updateNotificationPreferences = async (userId, preferences) => {
    const profile = await getOrCreateProfile(userId);
    profile.preferences = {
        ...profile.preferences?.toObject?.(),
        ...profile.preferences,
        ...preferences,
        criticalAlerts:
            preferences.criticalAlerts === false ? true : profile.preferences?.criticalAlerts ?? true,
    };
    await profile.save();
    return profile;
};

const requestDataExport = async (userId) => {
    const profile = await getOrCreateProfile(userId);
    profile.privacyRequests = {
        ...profile.privacyRequests?.toObject?.(),
        dataExportRequestedAt: new Date(),
        dataExportStatus: 'requested',
    };
    await profile.save();
    return profile.privacyRequests;
};

const requestAccountDeletion = async (userId, reason = '') => {
    const profile = await getOrCreateProfile(userId);
    const summary = await fetch(`${config.orderServiceUrl}/api/orders/summary`, {
        headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
        },
    })
        .then((response) => response.json().catch(() => null))
        .catch(() => null);

    const activeOrders = Number(summary?.data?.active_orders || 0);
    const blocked = activeOrders > 0;
    profile.privacyRequests = {
        ...profile.privacyRequests?.toObject?.(),
        accountDeletionRequestedAt: new Date(),
        accountDeletionStatus: blocked ? 'blocked_active_orders' : 'requested',
        accountDeletionReason: reason,
    };
    await profile.save();
    return profile.privacyRequests;
};

const getWishlist = async (userId) => {
    const profile = await getOrCreateProfile(userId);
    return profile.wishlist || [];
};

const addToWishlist = async (userId, productId, productType = 'gifting') => {
    const profile = await getOrCreateProfile(userId);
    const exists = profile.wishlist?.some((w) => w.productId === productId);
    if (exists) {
        const err = new Error('Product already in wishlist');
        err.statusCode = 409;
        throw err;
    }
    profile.wishlist = [...(profile.wishlist || []), { productId, productType, addedAt: new Date() }];
    await profile.save();
    return profile.wishlist;
};

const removeFromWishlist = async (userId, productId) => {
    const profile = await getOrCreateProfile(userId);
    const before = profile.wishlist?.length || 0;
    profile.wishlist = (profile.wishlist || []).filter((w) => w.productId !== productId);
    if (profile.wishlist.length === before) {
        const err = new Error('Product not found in wishlist');
        err.statusCode = 404;
        throw err;
    }
    await profile.save();
    return profile.wishlist;
};

const clearWishlist = async (userId) => {
    const profile = await getOrCreateProfile(userId);
    profile.wishlist = [];
    await profile.save();
    return [];
};

module.exports = {
    getOrCreateProfile,
    updateProfile,
    getAddresses,
    addAddress,
    updateAddress,
    updateAddressLocation,
    deleteAddress,
    updateNotificationPreferences,
    requestDataExport,
    requestAccountDeletion,
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
};
