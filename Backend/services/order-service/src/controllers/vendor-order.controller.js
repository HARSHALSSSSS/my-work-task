const orderService = require('../services/order.service');
const { sendSuccess, sendError } = require('../../../../shared/utils/response');

const getVendorId = (req) => req.headers['x-user-id'];

// GET /api/vendor/orders/queue — orders assigned to this vendor awaiting acceptance
const getQueue = async (req, res, next) => {
    try {
        const data = await orderService.getVendorQueue(getVendorId(req), req.query);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const getAssigned = async (req, res, next) => {
    try {
        const data = await orderService.getVendorQueue(getVendorId(req), req.query);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

// GET /api/vendor/orders/:id
const getVendorOrder = async (req, res, next) => {
    try {
        const data = await orderService.getVendorOrderById(getVendorId(req), req.params.id);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

// POST /api/vendor/orders/:id/accept
const acceptOrder = async (req, res, next) => {
    try {
        const data = await orderService.vendorUpdateStatus(
            req.params.id,
            getVendorId(req),
            'vendor_accepted',
            'Vendor accepted the order'
        );
        return sendSuccess(res, data, 'Order accepted');
    } catch (err) {
        next(err);
    }
};

// POST /api/vendor/orders/:id/reject
const rejectOrder = async (req, res, next) => {
    try {
        const { reason } = req.body;
        const data = await orderService.vendorUpdateStatus(
            req.params.id,
            getVendorId(req),
            'cancelled',
            reason || 'Rejected by vendor'
        );
        return sendSuccess(res, data, 'Order rejected');
    } catch (err) {
        next(err);
    }
};

// PATCH /api/vendor/orders/:id/start-production
const startProduction = async (req, res, next) => {
    try {
        const data = await orderService.vendorUpdateStatus(
            req.params.id,
            getVendorId(req),
            'in_production',
            'Production started'
        );
        return sendSuccess(res, data, 'Production started');
    } catch (err) {
        next(err);
    }
};

// PATCH /api/vendor/orders/:id/qc-pending
const markQcPending = async (req, res, next) => {
    try {
        const data = await orderService.vendorUpdateStatus(
            req.params.id,
            getVendorId(req),
            'qc_pending',
            'Quality check in progress'
        );
        return sendSuccess(res, data, 'QC pending');
    } catch (err) {
        next(err);
    }
};

// PATCH /api/vendor/orders/:id/ready-for-pickup
const markReadyForPickup = async (req, res, next) => {
    try {
        const data = await orderService.vendorUpdateStatus(
            req.params.id,
            getVendorId(req),
            'ready_for_pickup',
            'Order ready for pickup'
        );
        return sendSuccess(res, data, 'Ready for pickup');
    } catch (err) {
        next(err);
    }
};

const updateStatus = async (req, res, next) => {
    try {
        const { status, note } = req.body;
        const data = await orderService.vendorUpdateStatus(
            req.params.id,
            getVendorId(req),
            status,
            note || 'Status updated by vendor'
        );
        return sendSuccess(res, data, 'Order status updated');
    } catch (err) {
        next(err);
    }
};

const qcUpload = async (req, res, next) => {
    try {
        const { images } = req.body;
        return sendSuccess(res, { images, status: 'uploaded' }, 'QC evidence uploaded');
    } catch (err) {
        next(err);
    }
};

// GET /api/vendor/orders/score
const getVendorScore = async (req, res, next) => {
    try {
        const vendorId = getVendorId(req);
        const data = await orderService.getVendorScore(vendorId);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

// GET /api/vendor/orders/closure
const getVendorClosure = async (req, res, next) => {
    try {
        const vendorId = getVendorId(req);
        const { period = 'daily', date } = req.query;
        const data = await orderService.getVendorClosure(vendorId, period, date);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getQueue,
    getAssigned,
    getVendorOrder,
    acceptOrder,
    rejectOrder,
    startProduction,
    markQcPending,
    markReadyForPickup,
    updateStatus,
    qcUpload,
    getVendorScore,
    getVendorClosure,
};
