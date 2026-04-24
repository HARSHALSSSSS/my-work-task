const orderService = require('../services/order.service');
const { sendSuccess, sendCreated, sendError } = require('../../../../shared/utils/response');

const createOrder = async (req, res, next) => {
    try {
        const data = await orderService.createOrder(req.headers['x-user-id'], req.body);
        return sendCreated(res, data, 'Order placed successfully');
    } catch (err) {
        next(err);
    }
};

const getOrder = async (req, res, next) => {
    try {
        const data = await orderService.getCustomerOrderDetail(
            req.headers['x-user-id'],
            req.params.id
        );
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const getMyOrders = async (req, res, next) => {
    try {
        const data = await orderService.getUserOrders(req.headers['x-user-id'], req.query);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const getMyOrderSummary = async (req, res, next) => {
    try {
        const data = await orderService.getUserOrderSummary(req.headers['x-user-id']);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const updateStatus = async (req, res, next) => {
    try {
        const data = await orderService.updateOrderStatus(
            req.params.id,
            req.body.status,
            req.body.note
        );
        return sendSuccess(res, data, 'Order status updated');
    } catch (err) {
        next(err);
    }
};

const trackOrder = async (req, res, next) => {
    try {
        const data = await orderService.getTrackingView(req.headers['x-user-id'], req.params.id);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const getEstimatedDelivery = (status) => {
    const days = { pending: 3, confirmed: 2, processing: 1, ready: 0, out_for_delivery: 0 };
    const d = new Date();
    d.setDate(d.getDate() + (days[status] ?? 3));
    return d.toISOString().split('T')[0];
};

const getEditWindow = async (req, res, next) => {
    try {
        const data = await orderService.getEditWindow(req.headers['x-user-id'], req.params.id);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const updateBeforeProduction = async (req, res, next) => {
    try {
        const data = await orderService.updateBeforeProduction(
            req.headers['x-user-id'],
            req.params.id,
            req.body
        );
        return sendSuccess(res, data, 'Order updated');
    } catch (err) {
        next(err);
    }
};

const respondClarification = async (req, res, next) => {
    try {
        const data = await orderService.respondClarification(
            req.headers['x-user-id'],
            req.params.id,
            req.body.response
        );
        return sendSuccess(res, data, 'Clarification submitted');
    } catch (err) {
        next(err);
    }
};

const requestClarification = async (req, res, next) => {
    try {
        const data = await orderService.requestClarification(
            req.params.id,
            req.headers['x-user-role'] || 'staff',
            req.body.question,
            req.body.dueInMinutes
        );
        return sendSuccess(res, data, 'Clarification requested');
    } catch (err) {
        next(err);
    }
};

// PATCH /api/orders/:id/delivery-status — internal, called by delivery-service
const updateDeliveryStatus = async (req, res, next) => {
    try {
        const { deliveryStatus, riderId, etaMinutes, distanceKm, mappedOrderStatus } = req.body;
        const data = await orderService.updateDeliveryStatus(req.params.id, {
            deliveryStatus,
            riderId,
            etaMinutes,
            distanceKm,
            mappedOrderStatus,
        });
        return sendSuccess(res, data, 'Delivery status updated');
    } catch (err) {
        next(err);
    }
};

// POST /api/orders/:id/reorder
const reorder = async (req, res, next) => {
    try {
        const data = await orderService.reorder(req.headers['x-user-id'], req.params.id);
        return sendCreated(res, data, 'Reorder created');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createOrder,
    getOrder,
    getMyOrders,
    getMyOrderSummary,
    updateStatus,
    trackOrder,
    updateDeliveryStatus,
    reorder,
    getEditWindow,
    updateBeforeProduction,
    requestClarification,
    respondClarification,
};
