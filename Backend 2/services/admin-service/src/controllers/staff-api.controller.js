const mongoose = require('mongoose');
const { sendSuccess, sendError } = require('../../../../shared/utils/response');
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
    const existing = mongoose.connections.find(
        (c) => c.name === 'speedcopy_orders' && c.readyState === 1
    );
    if (existing) return existing;
    return mongoose
        .createConnection(config.getDbUri('order'), { family: 4, serverSelectionTimeoutMS: 5000 })
        .asPromise();
};

const getVendorConn = async () => {
    const existing = mongoose.connections.find(
        (c) => c.name === 'speedcopy_vendors' && c.readyState === 1
    );
    if (existing) return existing;
    return mongoose
        .createConnection(config.getDbUri('vendor'), { family: 4, serverSelectionTimeoutMS: 5000 })
        .asPromise();
};

const ORDER_STATUS_LABELS = {
    pending: 'Pending Assignment',
    confirmed: 'Confirmed',
    assigned_vendor: 'Assigned to Vendor',
    vendor_accepted: 'Vendor Accepted',
    in_production: 'In Production',
    qc_pending: 'QC Review',
    ready_for_pickup: 'Ready for Pickup',
    delivery_assigned: 'Delivery Assigned',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
};

const TERMINAL_STATUSES = new Set(['delivered', 'cancelled', 'refunded']);

const formatFlowType = (value = '') => {
    const text = String(value || 'general');
    return text.charAt(0).toUpperCase() + text.slice(1);
};

const getRisk = (createdAt, status) => {
    if (!createdAt || TERMINAL_STATUSES.has(status)) return 'normal';

    const ageMs = Date.now() - new Date(createdAt).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    if (ageHours >= 24) return 'critical';
    if (ageHours >= 6) return 'warning';
    return 'normal';
};

const getSlaLabel = (risk, status) => {
    if (TERMINAL_STATUSES.has(status)) return 'Done';
    if (risk === 'critical') return 'Breach Risk';
    if (risk === 'warning') return 'Monitor';
    return 'On Track';
};

const normalizeQueueOrder = (order) => {
    const status = String(order?.status || 'pending');
    const risk = getRisk(order?.createdAt, status);
    const firstItem = Array.isArray(order?.items) && order.items.length ? order.items[0] : null;

    return {
        id: String(order?._id || ''),
        type: formatFlowType(firstItem?.flowType),
        vendor: order?.vendorId || order?.storeId || 'Unassigned',
        status: ORDER_STATUS_LABELS[status] || formatFlowType(status.replace(/_/g, ' ')),
        sla: getSlaLabel(risk, status),
        risk,
        customer: order?.shippingAddress?.fullName || order?.userId || 'Customer',
        rawStatus: status,
        customerId: String(order?.userId || ''),
        amount: Number(order?.total || 0),
    };
};

const sendPlaceholder = (name, statusCode = 200) => (req, res) =>
    sendSuccess(
        res,
        {
            endpoint: name,
            params: req.params,
            query: req.query,
            body: req.body,
        },
        `${name} is available`,
        statusCode
    );

const login = (req, res) =>
    sendSuccess(
        res,
        {
            requiresMfa: false,
            session: {
                userId: req.headers['x-user-id'] || '',
                role: req.headers['x-user-role'] || 'staff',
                email: req.body?.email || req.headers['x-user-email'] || '',
            },
        },
        'Staff login endpoint is available'
    );

const verifyMfa = sendPlaceholder('verifyMfa');
const logout = sendPlaceholder('logout');
const getSession = sendPlaceholder('getSession');
const getSessions = sendPlaceholder('getSessions');
const killSession = sendPlaceholder('killSession');
const getUserRole = sendPlaceholder('getUserRole');
const getPermissions = sendPlaceholder('getPermissions');
const assignRole = sendPlaceholder('assignRole');
const getTasks = sendPlaceholder('getTasks');
const getTaskDetail = sendPlaceholder('getTaskDetail');
const completeTask = sendPlaceholder('completeTask');
const assignTask = sendPlaceholder('assignTask');
const getAssignableVendors = async (req, res, next) => {
    try {
        const conn = await getVendorConn();
        const vendors = await conn.db
            .collection('vendororgs')
            .find({
                deletedAt: null,
                isApproved: true,
                isSuspended: { $ne: true },
                userId: { $exists: true, $nin: ['', null] },
            })
            .sort({ priority: -1, createdAt: -1 })
            .limit(100)
            .toArray();

        return sendSuccess(
            res,
            {
                vendors: vendors.map((vendor) => ({
                    id: String(vendor.userId),
                    orgId: String(vendor._id),
                    name: vendor.name || vendor.businessName || 'Vendor',
                    location:
                        vendor.location ||
                        vendor.address?.city ||
                        vendor.address?.state ||
                        'Unknown',
                    score: Number(vendor.healthScore || 0),
                    priority: Number(vendor.priority || 0),
                })),
            },
            'Assignable vendors fetched'
        );
    } catch (err) {
        next(err);
    }
};
const getOrdersQueue = async (req, res, next) => {
    try {
        const conn = await getOrderConn();
        const filter = {
            status: {
                $in: [
                    'pending',
                    'confirmed',
                    'assigned_vendor',
                    'vendor_accepted',
                    'in_production',
                    'qc_pending',
                    'ready_for_pickup',
                    'delivery_assigned',
                    'out_for_delivery',
                ],
            },
        };

        const orders = await conn.db
            .collection('orders')
            .find(filter)
            .sort({ createdAt: -1 })
            .limit(100)
            .toArray();

        return sendSuccess(res, orders.map(normalizeQueueOrder), 'Order queue fetched');
    } catch (err) {
        next(err);
    }
};

const getOrderDetail = async (req, res, next) => {
    try {
        const conn = await getOrderConn();
        const order = await conn.db
            .collection('orders')
            .findOne({ _id: new mongoose.Types.ObjectId(req.params.id) });

        if (!order) {
            return sendError(res, 'Order not found', 404);
        }

        return sendSuccess(
            res,
            {
                ...normalizeQueueOrder(order),
                shippingAddress: order.shippingAddress || null,
                items: order.items || [],
                timeline: order.timeline || [],
                clarification: order.clarification || null,
                paymentStatus: order.paymentStatus || 'unpaid',
                createdAt: order.createdAt,
            },
            'Order detail fetched'
        );
    } catch (err) {
        next(err);
    }
};

const reassignVendor = async (req, res, next) => {
    try {
        const conn = await getOrderConn();
        const vendorId = req.body?.newVendorId || req.body?.vendorId;
        const reason = String(req.body?.reason || '').trim();

        if (!vendorId) {
            return sendError(res, 'newVendorId is required', 400);
        }

        const orderId = new mongoose.Types.ObjectId(req.params.id);
        const existingOrder = await conn.db.collection('orders').findOne({ _id: orderId });
        const result = await conn.db.collection('orders').findOneAndUpdate(
            { _id: orderId },
            {
                $set: {
                    vendorId,
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
                        storeId: '',
                        assignedBy: req.headers['x-user-id'] || 'staff',
                        reason: reason || `Reassigned to vendor ${vendorId}`,
                        assignedAt: new Date(),
                    },
                },
            },
            { returnDocument: 'after' }
        );

        if (!result.value) {
            return sendError(res, 'Order not found', 404);
        }

        await Promise.allSettled([
            emitNotification({
                userId: String(vendorId),
                title: 'Order assigned by staff',
                message: `Order ${existingOrder?.orderNumber || req.params.id} has been assigned to your queue.`,
                category: 'orders',
                metadata: { orderId: req.params.id, vendorId, reason },
            }),
            existingOrder?.userId
                ? emitNotification({
                      userId: String(existingOrder.userId),
                      title: 'Order reassigned',
                      message: `Your order ${existingOrder.orderNumber || req.params.id} has been reassigned for processing.`,
                      category: 'orders',
                      metadata: { orderId: req.params.id, vendorId, reason },
                  })
                : Promise.resolve(null),
            emitNotification({
                title: 'Staff reassigned vendor',
                message: `Order ${existingOrder?.orderNumber || req.params.id} was reassigned by ${req.headers['x-user-role'] || 'staff'}.`,
                audienceRoles: OPS_AUDIENCE_ROLES,
                metadata: { orderId: req.params.id, vendorId, reason },
            }),
        ]);

        return sendSuccess(res, normalizeQueueOrder(result.value), 'Vendor reassigned');
    } catch (err) {
        next(err);
    }
};

const raiseClarification = async (req, res, next) => {
    try {
        const conn = await getOrderConn();
        const message = String(req.body?.message || req.body?.question || '').trim();

        if (!message) {
            return sendError(res, 'message is required', 400);
        }

        const dueAt = new Date();
        dueAt.setMinutes(dueAt.getMinutes() + 30);

        const orderId = new mongoose.Types.ObjectId(req.params.id);
        const result = await conn.db.collection('orders').findOneAndUpdate(
            { _id: orderId },
            {
                $set: {
                    clarification: {
                        isRequired: true,
                        status: 'requested',
                        requestedByRole: req.headers['x-user-role'] || 'staff',
                        question: message,
                        response: '',
                        requestedAt: new Date(),
                        respondedAt: null,
                        dueAt,
                    },
                },
                $push: {
                    timeline: {
                        status: 'clarification_required',
                        note: message,
                        timestamp: new Date(),
                    },
                },
            },
            { returnDocument: 'after' }
        );

        if (!result.value) {
            return sendError(res, 'Order not found', 404);
        }

        await Promise.allSettled([
            result.value?.userId
                ? emitNotification({
                      userId: String(result.value.userId),
                      title: 'Clarification required',
                      message,
                      category: 'support',
                      metadata: { orderId: req.params.id, dueAt },
                  })
                : Promise.resolve(null),
            emitNotification({
                title: 'Staff requested clarification',
                message: `Clarification was requested for order ${result.value?.orderNumber || req.params.id}.`,
                audienceRoles: OPS_AUDIENCE_ROLES,
                metadata: { orderId: req.params.id, dueAt, requestedByRole: req.headers['x-user-role'] || 'staff' },
            }),
        ]);

        return sendSuccess(res, normalizeQueueOrder(result.value), 'Clarification requested');
    } catch (err) {
        next(err);
    }
};
const getTickets = sendPlaceholder('getTickets');
const getTicketDetail = sendPlaceholder('getTicketDetail');
const replyTicket = sendPlaceholder('replyTicket');
const closeTicket = sendPlaceholder('closeTicket');
const escalateTicket = sendPlaceholder('escalateTicket');
const getVendorTickets = sendPlaceholder('getVendorTickets');
const replyVendorTicket = sendPlaceholder('replyVendorTicket');
const uploadAttachments = (req, res) =>
    sendSuccess(
        res,
        {
            attachments: (req.files || []).map((file) => ({
                originalName: file.originalname,
                filename: file.filename,
                size: file.size,
                mimeType: file.mimetype,
            })),
        },
        'uploadAttachments is available'
    );
const getRefunds = sendPlaceholder('getRefunds');
const approveRefund = sendPlaceholder('approveRefund');
const escalateRefund = sendPlaceholder('escalateRefund');
const creditWallet = sendPlaceholder('creditWallet');
const debitWallet = sendPlaceholder('debitWallet');
const getWalletLedger = sendPlaceholder('getWalletLedger');
const getPayouts = sendPlaceholder('getPayouts');
const issuePayoutTicket = sendPlaceholder('issuePayoutTicket');
const getCampaigns = sendPlaceholder('getCampaigns');
const createCoupon = sendPlaceholder('createCoupon', 201);
const createTargeting = sendPlaceholder('createTargeting');
const getAnalyticsReports = sendPlaceholder('getAnalyticsReports');
const triggerEscalation = sendPlaceholder('triggerEscalation');
const getEscalations = sendPlaceholder('getEscalations');
const getAuditLogs = sendPlaceholder('getAuditLogs');
const getActivity = sendPlaceholder('getActivity');
const getPerformance = sendPlaceholder('getPerformance');
const getSystemStatus = sendPlaceholder('getSystemStatus');
const checkPermissions = sendPlaceholder('checkPermissions');
const conflictLock = sendPlaceholder('conflictLock');

module.exports = {
    login,
    verifyMfa,
    logout,
    getSession,
    getSessions,
    killSession,
    getUserRole,
    getPermissions,
    assignRole,
    getTasks,
    getTaskDetail,
    completeTask,
    assignTask,
    getAssignableVendors,
    getOrdersQueue,
    getOrderDetail,
    reassignVendor,
    raiseClarification,
    getTickets,
    getTicketDetail,
    replyTicket,
    closeTicket,
    escalateTicket,
    getVendorTickets,
    replyVendorTicket,
    uploadAttachments,
    getRefunds,
    approveRefund,
    escalateRefund,
    creditWallet,
    debitWallet,
    getWalletLedger,
    getPayouts,
    issuePayoutTicket,
    getCampaigns,
    createCoupon,
    createTargeting,
    getAnalyticsReports,
    triggerEscalation,
    getEscalations,
    getAuditLogs,
    getActivity,
    getPerformance,
    getSystemStatus,
    checkPermissions,
    conflictLock,
};
