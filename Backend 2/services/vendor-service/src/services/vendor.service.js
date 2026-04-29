const VendorOrg = require('../models/vendor-org.model');
const Store = require('../models/store.model');
const VendorStaff = require('../models/vendor-staff.model');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config');

const getAuthConn = async () => {
    const existing = mongoose.connections.find((c) => c.name === 'speedcopy_auth' && c.readyState === 1);
    if (existing) return existing;
    if (!config.authDbUri) {
        throw new Error('AUTH_DB_URI is not set');
    }

    return mongoose
        .createConnection(config.authDbUri, { family: 4, serverSelectionTimeoutMS: 5000 })
        .asPromise();
};


const getOrCreateOrg = async (userId) => {
    let org = await VendorOrg.findOne({ userId, deletedAt: null });
    if (!org) {
        org = await VendorOrg.create({ userId, businessName: 'My Business' });
    }
    return org;
};

const updateOrg = async (userId, data) => {
    const org = await VendorOrg.findOneAndUpdate({ userId, deletedAt: null }, data, {
        new: true,
        upsert: true,
        runValidators: true,
    });
    return org;
};


const getStores = async (vendorId) => {
    return Store.find({ vendorId, deletedAt: null }).sort({ createdAt: -1 });
};

const getStoreById = async (vendorId, storeId) => {
    const store = await Store.findOne({ _id: storeId, vendorId, deletedAt: null });
    if (!store) {
        const err = new Error('Store not found');
        err.statusCode = 404;
        throw err;
    }
    return store;
};

const createStore = async (vendorId, userId, data) => {
    const payload = {
        ...data,
        vendorId,
        userId,
        internalCode: data.internalCode || `${vendorId}-${Date.now()}`,
    };
    if (data.capacity?.dailyLimit && !data.capacity?.maxOrdersPerDay) {
        payload.capacity = {
            ...data.capacity,
            maxOrdersPerDay: data.capacity.dailyLimit,
        };
    }
    return Store.create(payload);
};

const updateStore = async (vendorId, storeId, data) => {
    const store = await Store.findOneAndUpdate({ _id: storeId, vendorId, deletedAt: null }, data, {
        new: true,
        runValidators: true,
    });
    if (!store) {
        const err = new Error('Store not found');
        err.statusCode = 404;
        throw err;
    }
    return store;
};

const updateStoreStatus = async (vendorId, storeId, isActive) => {
    return updateStore(vendorId, storeId, { isActive });
};

const updateStoreCapacity = async (vendorId, storeId, capacity) => {
    return updateStore(vendorId, storeId, { capacity });
};

const updateStoreAvailability = async (vendorId, storeId, isAvailable) => {
    return updateStore(vendorId, storeId, {
        isAvailable,
        availabilityReason: isAvailable ? '' : 'Marked unavailable by vendor',
    });
};


const getStaff = async (vendorId) => {
    return VendorStaff.find({ vendorId, deletedAt: null }).sort({ createdAt: -1 });
};

const createStaff = async (vendorId, data) => {
    if (!data?.name || !data?.email || !data?.password) {
        const err = new Error('Name, email, and password are required');
        err.statusCode = 400;
        throw err;
    }

    const normalizedEmail = String(data.email).trim().toLowerCase();
    const authConn = await getAuthConn();
    const existingAuthUser = await authConn.db.collection('users').findOne({ email: normalizedEmail });
    if (existingAuthUser) {
        const err = new Error('A login account already exists with this email');
        err.statusCode = 409;
        throw err;
    }

    const existingStaff = await VendorStaff.findOne({ vendorId, email: normalizedEmail, deletedAt: null });
    if (existingStaff) {
        const err = new Error('Staff member already exists with this email');
        err.statusCode = 409;
        throw err;
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const authUser = {
        name: data.name,
        email: normalizedEmail,
        password: hashedPassword,
        phone: data.phone || '',
        role: 'vendor',
        isActive: true,
        isEmailVerified: false,
        vendorStaffProfile: {
            vendorId,
            role: data.role || 'operator',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    const authResult = await authConn.db.collection('users').insertOne(authUser);

    return VendorStaff.create({
        ...data,
        vendorId,
        email: normalizedEmail,
        authUserId: authResult.insertedId.toString(),
        assignedStoreIds: data.assignedStoreIds || (data.storeId ? [data.storeId] : []),
        isFinancialAccessEnabled: false,
    });
};

const updateStaff = async (vendorId, staffId, data) => {
    const staff = await VendorStaff.findOneAndUpdate(
        { _id: staffId, vendorId, deletedAt: null },
        data,
        { new: true, runValidators: true }
    );
    if (!staff) {
        const err = new Error('Staff member not found');
        err.statusCode = 404;
        throw err;
    }
    return staff;
};

const updateStaffStatus = async (vendorId, staffId, isActive) => {
    return updateStaff(vendorId, staffId, { isActive });
};

const assignStaffStores = async (vendorId, staffId, assignedStoreIds) => {
    return updateStaff(vendorId, staffId, {
        assignedStoreIds,
        storeId: assignedStoreIds?.[0] || '',
    });
};


const getNearbyStores = async (userLat, userLng, radiusKm = 10, limit = 20) => {
    const radiusMeters = radiusKm * 1000;

    const stores = await Store.aggregate([
        {
            $geoNear: {
                near: {
                    type: 'Point',
                    coordinates: [userLng, userLat], // Note: MongoDB uses [lng, lat]
                },
                distanceField: 'distance',
                maxDistance: radiusMeters,
                spherical: true,
                query: {
                    isActive: true,
                    isAvailable: true,
                    deletedAt: null,
                    'location.lat': { $exists: true },
                    'location.lng': { $exists: true },
                },
            },
        },
        {
            $lookup: {
                from: 'vendororgs',
                localField: 'vendorId',
                foreignField: 'userId',
                as: 'vendorOrg',
            },
        },
        {
            $unwind: '$vendorOrg',
        },
        {
            $match: {
                'vendorOrg.isApproved': true,
                'vendorOrg.isSuspended': { $ne: true },
            },
        },
        {
            $project: {
                _id: 1,
                name: 1,
                address: 1,
                location: 1,
                workingHours: 1,
                supportedFlows: 1,
                capacity: 1,
                distance: 1,
            },
        },
        {
            $sort: { distance: 1 },
        },
        {
            $limit: limit,
        },
    ]);

    return {
        stores,
        totalFound: stores.length,
        searchLocation: { lat: userLat, lng: userLng },
        searchRadius: radiusKm,
    };
};

// ─── Analytics ────────────────────────────────────────────

const getPerformance = async (vendorId) => {
    // Basic performance stats — can be enriched later with order-service data
    const [totalStores, activeStores, totalStaff] = await Promise.all([
        Store.countDocuments({ vendorId, deletedAt: null }),
        Store.countDocuments({ vendorId, isActive: true, deletedAt: null }),
        VendorStaff.countDocuments({ vendorId, isActive: true, deletedAt: null }),
    ]);

    const capacitySnapshot = await Store.find({ vendorId, deletedAt: null })
        .select('name capacity isAvailable availabilityReason')
        .lean();

    return { totalStores, activeStores, totalStaff, capacitySnapshot };
};

module.exports = {
    getOrCreateOrg,
    updateOrg,
    getStores,
    getStoreById,
    createStore,
    updateStore,
    updateStoreStatus,
    updateStoreCapacity,
    updateStoreAvailability,
    getNearbyStores,
    getStaff,
    createStaff,
    updateStaff,
    updateStaffStatus,
    assignStaffStores,
    getPerformance,
};
