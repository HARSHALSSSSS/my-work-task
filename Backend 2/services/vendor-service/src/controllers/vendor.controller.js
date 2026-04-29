const vendorService = require('../services/vendor.service');
const { sendSuccess, sendCreated, sendError } = require('../../../../shared/utils/response');

const getVendorId = (req) => req.headers['x-user-id'];


const getProfile = async (req, res, next) => {
    try {
        const data = await vendorService.getOrCreateOrg(getVendorId(req));
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const data = await vendorService.updateOrg(getVendorId(req), req.body);
        return sendSuccess(res, data, 'Profile updated');
    } catch (err) {
        next(err);
    }
};


const getStores = async (req, res, next) => {
    try {
        const data = await vendorService.getStores(getVendorId(req));
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const getStore = async (req, res, next) => {
    try {
        const data = await vendorService.getStoreById(getVendorId(req), req.params.id);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const createStore = async (req, res, next) => {
    try {
        const data = await vendorService.createStore(getVendorId(req), getVendorId(req), req.body);
        return sendCreated(res, data, 'Store created');
    } catch (err) {
        next(err);
    }
};

const updateStore = async (req, res, next) => {
    try {
        const data = await vendorService.updateStore(getVendorId(req), req.params.id, req.body);
        return sendSuccess(res, data, 'Store updated');
    } catch (err) {
        next(err);
    }
};

const updateStoreStatus = async (req, res, next) => {
    try {
        const { isActive } = req.body;
        const data = await vendorService.updateStoreStatus(
            getVendorId(req),
            req.params.id,
            isActive
        );
        return sendSuccess(res, data, 'Store status updated');
    } catch (err) {
        next(err);
    }
};

const updateStoreCapacity = async (req, res, next) => {
    try {
        const data = await vendorService.updateStoreCapacity(
            getVendorId(req),
            req.params.id,
            req.body
        );
        return sendSuccess(res, data, 'Capacity updated');
    } catch (err) {
        next(err);
    }
};

const updateStoreAvailability = async (req, res, next) => {
    try {
        const { isAvailable } = req.body;
        const data = await vendorService.updateStoreAvailability(
            getVendorId(req),
            req.params.id,
            isAvailable
        );
        return sendSuccess(res, data, 'Availability updated');
    } catch (err) {
        next(err);
    }
};

const getStoreCapabilities = async (req, res, next) => {
    try {
        const store = await vendorService.getStoreById(getVendorId(req), req.params.id);
        return sendSuccess(res, {
            supportedFlows: store.supportedFlows || [],
            maxOrdersPerDay: store.maxOrdersPerDay || 0,
            currentLoad: store.currentLoad || 0
        });
    } catch (err) {
        next(err);
    }
};


const getStaff = async (req, res, next) => {
    try {
        const data = await vendorService.getStaff(getVendorId(req));
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const createStaff = async (req, res, next) => {
    try {
        const data = await vendorService.createStaff(getVendorId(req), req.body);
        return sendCreated(
            res,
            {
                ...data.toObject(),
                loginCredentials: {
                    email: data.email,
                    password: req.body.password,
                },
            },
            'Staff member added'
        );
    } catch (err) {
        next(err);
    }
};

const updateStaff = async (req, res, next) => {
    try {
        const data = await vendorService.updateStaff(getVendorId(req), req.params.id, req.body);
        return sendSuccess(res, data, 'Staff updated');
    } catch (err) {
        next(err);
    }
};

const updateStaffStatus = async (req, res, next) => {
    try {
        const { isActive } = req.body;
        const data = await vendorService.updateStaffStatus(
            getVendorId(req),
            req.params.id,
            isActive
        );
        return sendSuccess(res, data, 'Staff status updated');
    } catch (err) {
        next(err);
    }
};

const assignStaffStores = async (req, res, next) => {
    try {
        const data = await vendorService.assignStaffStores(
            getVendorId(req),
            req.params.id,
            req.body.assignedStoreIds || []
        );
        return sendSuccess(res, data, 'Staff stores assigned');
    } catch (err) {
        next(err);
    }
};


const getNearbyStores = async (req, res, next) => {
    try {
        const { lat, lng, radius = 10, limit = 20 } = req.query;

        if (!lat || !lng) {
            return sendError(res, 'Latitude and longitude are required', 400);
        }

        const data = await vendorService.getNearbyStores(
            parseFloat(lat),
            parseFloat(lng),
            parseFloat(radius),
            parseInt(limit)
        );
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const getPerformance = async (req, res, next) => {
    try {
        const data = await vendorService.getPerformance(getVendorId(req));
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getProfile,
    updateProfile,
    getStores,
    getStore,
    createStore,
    updateStore,
    updateStoreStatus,
    updateStoreCapacity,
    updateStoreAvailability,
    getStoreCapabilities,
    getNearbyStores,
    getStaff,
    createStaff,
    updateStaff,
    updateStaffStatus,
    assignStaffStores,
    getPerformance,
};
