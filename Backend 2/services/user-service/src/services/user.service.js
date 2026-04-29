const Profile = require('../models/profile.model');
const Address = require('../models/address.model');
const config = require('../config');

const getOrCreateProfile = async (userId) => {
    return Profile.findOneAndUpdate(
        { userId },
        { $setOnInsert: { userId } },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
        }
    );
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
    await getOrCreateProfile(userId);

    const updatedProfile = await Profile.findOneAndUpdate(
        {
            userId,
            wishlist: {
                $not: {
                    $elemMatch: { productId },
                },
            },
        },
        {
            $push: {
                wishlist: {
                    productId,
                    productType,
                    addedAt: new Date(),
                },
            },
        },
        { new: true }
    );

    if (!updatedProfile) {
        const err = new Error('Product already in wishlist');
        err.statusCode = 409;
        throw err;
    }

    return updatedProfile.wishlist || [];
};

const removeFromWishlist = async (userId, productId) => {
    const updatedProfile = await Profile.findOneAndUpdate(
        {
            userId,
            'wishlist.productId': productId,
        },
        {
            $pull: {
                wishlist: { productId },
            },
        },
        { new: true }
    );

    if (!updatedProfile) {
        const err = new Error('Product not found in wishlist');
        err.statusCode = 404;
        throw err;
    }

    return updatedProfile.wishlist || [];
};

const clearWishlist = async (userId) => {
    await Profile.findOneAndUpdate(
        { userId },
        {
            $set: { wishlist: [] },
            $setOnInsert: { userId },
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
        }
    );

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
