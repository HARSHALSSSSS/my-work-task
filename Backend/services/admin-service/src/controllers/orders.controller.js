const mongoose = require('mongoose');
const { sendSuccess, sendError } = require('../../../../shared/utils/response');
const { paginate, paginateMeta } = require('../../../../shared/utils/pagination');
const AuditLog = require('../models/audit-log.model');
const config = require('../config');

const OPS_AUDIENCE_ROLES = ['admin', 'ops', 'support', 'finance', 'marketing'];

const emitNotification = async (payload) => {
    if (!config.notificationServiceUrl || !config.internalServiceToken) return;
    await fetch(`${config.notificationServiceUrl}/api/notifications/internal`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-internal-token': config.internalServiceToken,
        },
        body: JSON.stringify({
            type: 'in_app',
            category: 'system',
            status: 'sent',
            ...payload,
        }),
    }).catch(() => null);
};

const getOrderConn = async () => {
    const uri = process.env.ORDER_DB_URI || 'mongodb://127.0.0.1:27017/speedcopy_orders';
    if (mongoose.connections.find((c) => c.name === 'speedcopy_orders' && c.readyState === 1)) {
        return mongoose.connections.find((c) => c.name === 'speedcopy_orders');
    }
    return mongoose
        .createConnection(uri, { family: 4, serverSelectionTimeoutMS: 5000 })
        .asPromise();
};

const getOrders = async (req, res, next) => {
    try {
        const conn = await getOrderConn();
        const { page, limit, skip } = paginate(req.query);
        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.userId) filter.userId = req.query.userId;
        if (req.query.vendorId) filter.vendorId = req.query.vendorId;

        const [orders, total] = await Promise.all([
            conn.db
                .collection('orders')
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            conn.db.collection('orders').countDocuments(filter),
        ]);

        return sendSuccess(res, { orders, meta: paginateMeta(total, page, limit) });
    } catch (err) {
        next(err);
    }
};

const getOrder = async (req, res, next) => {
    try {
        const conn = await getOrderConn();
        const order = await conn.db
            .collection('orders')
            .findOne({ _id: new mongoose.Types.ObjectId(req.params.id) });
        if (!order) return sendError(res, 'Order not found', 404);
        return sendSuccess(res, order);
    } catch (err) {
        next(err);
    }
};

const reassignVendor = async (req, res, next) => {
    try {
        const conn = await getOrderConn();
        const { vendorId, storeId, reason = '' } = req.body;
        const orderId = new mongoose.Types.ObjectId(req.params.id);
        const existingOrder = await conn.db.collection('orders').findOne({ _id: orderId });
        await conn.db.collection('orders').updateOne(
            { _id: orderId },
            {
                $set: {
                    vendorId,
                    storeId,
                    status: 'assigned_vendor',
                    assignedAt: new Date(),
                    customerFacingStatus: 'Processing by SpeedCopy',
                },
                $push: {
                    timeline: {
                        status: 'assigned_vendor',
                        note: reason || `Reassigned to vendor ${vendorId}`,
                        timestamp: new Date(),
                    },
                    assignmentHistory: {
                        vendorId,
                        storeId,
                        assignedBy: req.headers['x-user-id'] || 'admin',
                        reason: reason || `Reassigned to vendor ${vendorId}`,
                        assignedAt: new Date(),
                    },
                },
            }
        );
        await AuditLog.create({
            actorId: req.headers['x-user-id'] || '',
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.orders.reassign_vendor',
            targetType: 'order',
            targetId: req.params.id,
            reason,
            metadata: { vendorId, storeId },
        });
        await Promise.allSettled([
            emitNotification({
                userId: String(vendorId),
                title: 'Order assigned to your team',
                message: `Order ${existingOrder?.orderNumber || req.params.id} has been assigned by admin.`,
                category: 'orders',
                metadata: { orderId: req.params.id, vendorId, storeId, reason },
            }),
            existingOrder?.userId
                ? emitNotification({
                      userId: String(existingOrder.userId),
                      title: 'Order reassigned',
                      message: `Your order ${existingOrder.orderNumber || req.params.id} has been reassigned for faster processing.`,
                      category: 'orders',
                      metadata: { orderId: req.params.id, vendorId, storeId, reason },
                  })
                : Promise.resolve(null),
            emitNotification({
                title: 'Admin reassigned vendor',
                message: `Order ${existingOrder?.orderNumber || req.params.id} was reassigned to vendor ${vendorId}.`,
                audienceRoles: OPS_AUDIENCE_ROLES,
                metadata: { orderId: req.params.id, vendorId, storeId, reason },
            }),
        ]);
        return sendSuccess(res, null, 'Vendor reassigned');
    } catch (err) {
        next(err);
    }
};

const cancelOrder = async (req, res, next) => {
    try {
        const conn = await getOrderConn();
        const { reason } = req.body;
        const orderId = new mongoose.Types.ObjectId(req.params.id);
        const existingOrder = await conn.db.collection('orders').findOne({ _id: orderId });
        await conn.db.collection('orders').updateOne(
            { _id: orderId },
            {
                $set: {
                    status: 'cancelled',
                    customerFacingStatus: 'Order cancelled by SpeedCopy',
                    cancelledAt: new Date(),
                },
                $push: {
                    timeline: {
                        status: 'cancelled',
                        note: reason || 'Cancelled by admin',
                        timestamp: new Date(),
                    },
                },
            }
        );
        await AuditLog.create({
            actorId: req.headers['x-user-id'] || '',
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.orders.cancel',
            targetType: 'order',
            targetId: req.params.id,
            reason: reason || 'Cancelled by admin',
        });
        await Promise.allSettled([
            existingOrder?.userId
                ? emitNotification({
                      userId: String(existingOrder.userId),
                      title: 'Order cancelled',
                      message: `Your order ${existingOrder.orderNumber || req.params.id} was cancelled by SpeedCopy.`,
                      category: 'orders',
                      metadata: { orderId: req.params.id, reason: reason || 'Cancelled by admin' },
                  })
                : Promise.resolve(null),
            existingOrder?.vendorId
                ? emitNotification({
                      userId: String(existingOrder.vendorId),
                      title: 'Assigned order cancelled',
                      message: `Order ${existingOrder.orderNumber || req.params.id} was cancelled by admin.`,
                      category: 'orders',
                      metadata: { orderId: req.params.id, reason: reason || 'Cancelled by admin' },
                  })
                : Promise.resolve(null),
            emitNotification({
                title: 'Admin cancelled order',
                message: `Order ${existingOrder?.orderNumber || req.params.id} was cancelled.`,
                audienceRoles: OPS_AUDIENCE_ROLES,
                metadata: { orderId: req.params.id, reason: reason || 'Cancelled by admin' },
            }),
        ]);
        return sendSuccess(res, null, 'Order cancelled');
    } catch (err) {
        next(err);
    }
};

const refundOrder = async (req, res, next) => {
    try {
        const conn = await getOrderConn();
        const { refundId, reason = 'Refund processed by admin' } = req.body;
        const orderId = new mongoose.Types.ObjectId(req.params.id);
        const existingOrder = await conn.db.collection('orders').findOne({ _id: orderId });
        await conn.db.collection('orders').updateOne(
            { _id: orderId },
            {
                $set: {
                    status: 'refunded',
                    paymentStatus: 'refunded',
                    customerFacingStatus: 'Refund initiated by SpeedCopy',
                    refundId,
                },
                $push: {
                    timeline: {
                        status: 'refunded',
                        note: reason,
                        timestamp: new Date(),
                    },
                },
            }
        );
        await AuditLog.create({
            actorId: req.headers['x-user-id'] || '',
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.orders.refund',
            targetType: 'order',
            targetId: req.params.id,
            reason,
            metadata: { refundId },
        });
        await Promise.allSettled([
            existingOrder?.userId
                ? emitNotification({
                      userId: String(existingOrder.userId),
                      title: 'Refund initiated',
                      message: `Refund has been initiated for order ${existingOrder.orderNumber || req.params.id}.`,
                      category: 'orders',
                      metadata: { orderId: req.params.id, refundId, reason },
                  })
                : Promise.resolve(null),
            existingOrder?.vendorId
                ? emitNotification({
                      userId: String(existingOrder.vendorId),
                      title: 'Order refunded',
                      message: `Order ${existingOrder.orderNumber || req.params.id} has been refunded by admin.`,
                      category: 'orders',
                      metadata: { orderId: req.params.id, refundId, reason },
                  })
                : Promise.resolve(null),
            emitNotification({
                title: 'Admin initiated refund',
                message: `Refund started for order ${existingOrder?.orderNumber || req.params.id}.`,
                audienceRoles: OPS_AUDIENCE_ROLES,
                metadata: { orderId: req.params.id, refundId, reason },
            }),
        ]);
        return sendSuccess(res, null, 'Order refunded');
    } catch (err) {
        next(err);
    }
};

module.exports = { getOrders, getOrder, reassignVendor, cancelOrder, refundOrder };
