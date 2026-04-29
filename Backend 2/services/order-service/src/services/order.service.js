const Order = require('../models/order.model');
const { paginate, paginateMeta } = require('../../../../shared/utils/pagination');
const config = require('../config');
const { getUserAddresses, saveUserAddress } = require('./catalog.service');
const OPS_AUDIENCE_ROLES = ['admin', 'ops', 'support', 'finance', 'marketing'];

const CUSTOMER_STATUS_LABELS = {
    pending: 'Order placed',
    confirmed: 'Confirmed by SpeedCopy',
    assigned_vendor: 'Processing by SpeedCopy',
    vendor_accepted: 'Processing by SpeedCopy',
    in_production: 'In production',
    qc_pending: 'Quality check in progress',
    ready_for_pickup: 'Ready for pickup',
    delivery_assigned: 'Out for handoff',
    out_for_delivery: 'Out for delivery',
    delivered: 'Delivered',
    cancelled: 'Order cancelled by SpeedCopy',
    refunded: 'Refund initiated by SpeedCopy',
    failed: 'Order under review',
};

const EDIT_LOCK_STATUSES = ['in_production', 'qc_pending', 'ready_for_pickup', 'delivery_assigned', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'];

const buildEditableWindow = (createdAt = new Date()) => {
    const editableUntil = new Date(createdAt);
    editableUntil.setHours(editableUntil.getHours() + 2);
    return {
        isEditable: true,
        editableUntil,
        lockedReason: '',
    };
};

const refreshEditWindow = (order) => {
    if (!order.editWindow?.editableUntil) {
        order.editWindow = buildEditableWindow(order.createdAt || new Date());
    }

    const expired = order.editWindow.editableUntil && new Date(order.editWindow.editableUntil) < new Date();
    const lockedByStatus = EDIT_LOCK_STATUSES.includes(order.status);
    order.editWindow.isEditable = !expired && !lockedByStatus;
    order.editWindow.lockedReason = lockedByStatus
        ? 'Edits are locked after production starts'
        : expired
            ? 'Edit window expired'
            : '';
    return order;
};

const toCustomerSafeOrder = (order) => {
    const source = order.toObject ? order.toObject() : order;
    const timeline = (source.timeline || []).map((item) => ({
        status: item.status,
        note: item.status === 'assigned_vendor' || item.status === 'vendor_accepted'
            ? 'Processing by SpeedCopy'
            : item.note,
        timestamp: item.timestamp,
    }));

    return {
        ...source,
        vendorId: undefined,
        storeId: undefined,
        assignmentHistory: undefined,
        failureReason: undefined,
        customerFacingStatus: CUSTOMER_STATUS_LABELS[source.status] || 'Processing by SpeedCopy',
        timeline,
    };
};

const emitNotification = async ({ userId, title, message, category = 'orders', metadata = {} }) => {
    if (!config.notificationServiceUrl || !config.internalServiceToken) return;
    if (!userId && (!Array.isArray(metadata.audienceRoles) || metadata.audienceRoles.length === 0)) return;
    await fetch(`${config.notificationServiceUrl}/api/notifications/internal`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-internal-token': config.internalServiceToken,
        },
        body: JSON.stringify({
            userId,
            audienceRoles: metadata.audienceRoles || [],
            type: 'in_app',
            title,
            message,
            category,
            metadata,
            status: 'sent',
        }),
    }).catch(() => null);
};

const notifyOperations = async (title, message, metadata = {}) =>
    emitNotification({
        title,
        message,
        category: 'system',
        metadata: { ...metadata, audienceRoles: OPS_AUDIENCE_ROLES },
    });

const hasDeliveryAddress = (order) => {
    const address = order?.shippingAddress;
    return Boolean(address?.line1 && address?.city && address?.state && address?.pincode);
};

const normalizeShippingAddress = (address = {}) => {
    const lat = address?.location?.lat;
    const lng = address?.location?.lng;
    const normalized = {
        fullName: String(address.fullName || address.name || '').trim(),
        phone: String(address.phone || '').trim(),
        line1: String(address.line1 || address.addressLine || '').trim(),
        line2: String(address.line2 || '').trim(),
        city: String(address.city || '').trim(),
        state: String(address.state || '').trim(),
        pincode: String(address.pincode || address.zipcode || address.postalCode || '').trim(),
        country: String(address.country || 'India').trim() || 'India',
        ...(Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
            ? {
                  location: {
                      lat: Number(lat),
                      lng: Number(lng),
                      ...(address?.location?.accuracyMeters !== undefined
                          ? { accuracyMeters: Number(address.location.accuracyMeters) }
                          : {}),
                      ...(address?.location?.source
                          ? { source: String(address.location.source).trim() }
                          : {}),
                      capturedAt: address?.location?.capturedAt
                          ? new Date(address.location.capturedAt)
                          : new Date(),
                  },
              }
            : {}),
    };

    return Object.fromEntries(
        Object.entries(normalized).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
    );
};

const isCompleteShippingAddress = (address) =>
    Boolean(
        address?.fullName &&
        address?.phone &&
        address?.line1 &&
        address?.city &&
        address?.state &&
        address?.pincode
    );

const addressesMatch = (left = {}, right = {}) =>
    normalizeShippingAddress(left).fullName === normalizeShippingAddress(right).fullName &&
    normalizeShippingAddress(left).phone === normalizeShippingAddress(right).phone &&
    normalizeShippingAddress(left).line1 === normalizeShippingAddress(right).line1 &&
    normalizeShippingAddress(left).line2 === normalizeShippingAddress(right).line2 &&
    normalizeShippingAddress(left).city === normalizeShippingAddress(right).city &&
    normalizeShippingAddress(left).state === normalizeShippingAddress(right).state &&
    normalizeShippingAddress(left).pincode === normalizeShippingAddress(right).pincode &&
    normalizeShippingAddress(left).country === normalizeShippingAddress(right).country;

const syncShippingAddressBook = async (userId, shippingAddress) => {
    const normalized = normalizeShippingAddress(shippingAddress);
    if (!isCompleteShippingAddress(normalized)) return null;

    try {
        const existingAddresses = await getUserAddresses(userId).catch(() => []);
        const alreadySaved = Array.isArray(existingAddresses)
            && existingAddresses.some((address) => addressesMatch(address, normalized));

        if (alreadySaved) return null;

        return await saveUserAddress(userId, {
            fullName: normalized.fullName,
            phone: normalized.phone,
            line1: normalized.line1,
            line2: normalized.line2,
            city: normalized.city,
            state: normalized.state,
            pincode: normalized.pincode,
            country: normalized.country || 'India',
            ...(normalized.location ? { location: normalized.location } : {}),
            isDefault: !existingAddresses.length,
        });
    } catch (_) {
        return null;
    }
};

const joinAddressParts = (...parts) =>
    parts
        .map((part) => String(part || '').trim())
        .filter(Boolean)
        .join(', ');

const buildDeliveryTaskItemId = (item, index) => {
    const base = String(item.productId || item._id || item.productName || 'item').trim();
    const variant = String(item.variantId || item.variantIndex || '').trim();
    return [base, variant, `line-${index + 1}`].filter(Boolean).join(':');
};

const buildDeliveryTaskPayload = (order) => {
    const address = order.shippingAddress || {};
    const cityStatePincode = joinAddressParts(address.city, address.state, address.pincode);
    const pickupLabel = order.pickupShopId
        ? 'SpeedCopy Pickup Shop'
        : order.storeId
          ? 'SpeedCopy Partner Store'
          : order.vendorId
            ? 'SpeedCopy Vendor Hub'
            : 'SpeedCopy Fulfillment Center';

    const pickupAddress = joinAddressParts(
        pickupLabel,
        cityStatePincode || 'Order processing hub',
        address.country || 'India'
    );

    const dropoffAddress = joinAddressParts(
        address.line1,
        address.line2,
        address.city,
        address.state,
        address.pincode,
        address.country || 'India'
    );

    return {
        orderId: String(order._id),
        customerId: String(order.userId),
        orderNumber: String(order.orderNumber || ''),
        orderSubtotal: Number(order.subtotal || 0),
        deliveryCharge: Number(order.deliveryCharge || 0),
        orderTotal: Number(order.total || 0),
        pickup: {
            name: pickupLabel,
            addressLine: pickupAddress,
            note: order.pickupShopId
                ? `Pickup shop reference: ${order.pickupShopId}`
                : order.storeId
                  ? `Store reference: ${order.storeId}`
                  : order.vendorId
                    ? `Vendor reference: ${order.vendorId}`
                    : 'Auto-created from order-service',
            contactName: 'SpeedCopy Dispatch',
            contactPhone: '',
            location: { lat: 0, lng: 0 },
        },
        dropoff: {
            name: address.fullName || 'Customer',
            addressLine: dropoffAddress,
            note: order.notes || '',
            contactName: address.fullName || 'Customer',
            contactPhone: address.phone || '',
            location:
                Number.isFinite(Number(address?.location?.lat)) && Number.isFinite(Number(address?.location?.lng))
                    ? {
                          lat: Number(address.location.lat),
                          lng: Number(address.location.lng),
                      }
                    : { lat: 0, lng: 0 },
        },
        items: (order.items || []).map((item, index) => ({
            itemId: buildDeliveryTaskItemId(item, index),
            title: item.productName || 'Order item',
            subtitle: item.flowType || '',
            quantity: Number(item.quantity || 1),
            unitPrice: Number(item.unitPrice || item.salePrice || 0),
            totalPrice: Number(item.totalPrice || 0),
            thumbnail: item.thumbnail || '',
        })),
        specialInstructions: order.notes || '',
        etaMinutes: Number(order.deliveryEtaMinutes || 0),
        distanceKm: Number(order.deliveryDistanceKm || 0),
    };
};

const ensureDeliveryTaskForOrder = async (order) => {
    if (!config.deliveryServiceUrl || !config.internalServiceToken || !hasDeliveryAddress(order)) {
        return null;
    }

    const response = await fetch(`${config.deliveryServiceUrl}/api/delivery/internal/tasks`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-internal-token': config.internalServiceToken,
        },
        body: JSON.stringify(buildDeliveryTaskPayload(order)),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
        const error = new Error(
            payload?.error?.message || `Unable to create delivery task (${response.status})`
        );
        error.statusCode = response.status || 502;
        throw error;
    }

    return payload.data;
};

const createOrder = async (userId, data) => {
    const normalizedShippingAddress = data.shippingAddress
        ? normalizeShippingAddress(data.shippingAddress)
        : undefined;

    const order = await Order.create({
        ...data,
        shippingAddress: normalizedShippingAddress,
        userId,
        customerFacingStatus: CUSTOMER_STATUS_LABELS.pending,
        editWindow: buildEditableWindow(new Date()),
        clarification: { status: 'none', isRequired: false },
        timeline: [{ status: 'pending', note: 'Order placed' }],
    });
    await Promise.allSettled([
        ensureDeliveryTaskForOrder(order),
        normalizedShippingAddress ? syncShippingAddressBook(userId, normalizedShippingAddress) : Promise.resolve(null),
    ]);
    await Promise.allSettled([
        emitNotification({
            userId: order.userId,
            title: 'Order placed',
            message: `Your order ${order.orderNumber || ''} has been placed successfully.`.trim(),
            metadata: { orderId: String(order._id), status: order.status },
        }),
        notifyOperations(
            'New order placed',
            `Order ${order.orderNumber || String(order._id)} was placed and is ready for processing.`,
            {
                orderId: String(order._id),
                orderNumber: order.orderNumber || '',
                status: order.status,
                customerId: String(order.userId),
            }
        ),
        order.vendorId
            ? emitNotification({
                  userId: String(order.vendorId),
                  title: 'New order assigned',
                  message: `Order ${order.orderNumber || String(order._id)} has been assigned to your queue.`,
                  metadata: { orderId: String(order._id), status: order.status, customerId: String(order.userId) },
              })
            : Promise.resolve(null),
    ]);
    return order;
};

const getOrderById = async (userId, orderId) => {
    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) {
        const err = new Error('Order not found');
        err.statusCode = 404;
        throw err;
    }
    refreshEditWindow(order);
    return order;
};

const getInternalOrderSnapshot = async (orderId) => {
    const order = await Order.findById(orderId).lean();
    if (!order) {
        const err = new Error('Order not found');
        err.statusCode = 404;
        throw err;
    }

    return {
        orderId: String(order._id),
        orderNumber: String(order.orderNumber || ''),
        subtotal: Number(order.subtotal || 0),
        deliveryCharge: Number(order.deliveryCharge || 0),
        total: Number(order.total || 0),
        items: (order.items || []).map((item, index) => ({
            itemId: String(item.productId || item._id || item.productName || `item-${index + 1}`),
            productId: String(item.productId || ''),
            productName: item.productName || 'Order item',
            quantity: Number(item.quantity || 1),
            unitPrice: Number(item.unitPrice || item.salePrice || 0),
            totalPrice: Number(item.totalPrice || 0),
            flowType: item.flowType || '',
            thumbnail: item.thumbnail || '',
            variantId: item.variantId || '',
        })),
    };
};

const getCustomerOrderDetail = async (userId, orderId) => {
    const order = await getOrderById(userId, orderId);
    return toCustomerSafeOrder(order);
};

const getUserOrders = async (userId, query) => {
    const { page, limit, skip } = paginate(query);
    const filter = { userId };
    if (query.status) filter.status = query.status;
    if (query.search) {
        const pattern = new RegExp(query.search, 'i');
        filter.$or = [{ orderNumber: pattern }, { 'items.productName': pattern }];
    }

    const [orders, total] = await Promise.all([
        Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Order.countDocuments(filter),
    ]);

    return { orders: orders.map(toCustomerSafeOrder), meta: paginateMeta(total, page, limit) };
};

const getUserOrderSummary = async (userId) => {
    const [summaryRows, activeOrders, recentOrders] = await Promise.all([
        Order.aggregate([
            { $match: { userId } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        Order.countDocuments({
            userId,
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
        }),
        Order.find({ userId }).sort({ createdAt: -1 }).limit(5),
    ]);

    const statusCounts = summaryRows.reduce(
        (accumulator, row) => ({ ...accumulator, [row._id]: row.count }),
        {}
    );

    return {
        total_orders: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
        active_orders: activeOrders,
        delivered_orders: statusCounts.delivered || 0,
        cancelled_orders: statusCounts.cancelled || 0,
        status_counts: statusCounts,
        recent_orders: recentOrders.map(toCustomerSafeOrder),
    };
};

const updateOrderStatus = async (orderId, status, note = '') => {
    const order = await Order.findById(orderId);
    if (!order) {
        const err = new Error('Order not found');
        err.statusCode = 404;
        throw err;
    }
    order.status = status;
    order.customerFacingStatus = CUSTOMER_STATUS_LABELS[status] || order.customerFacingStatus;
    order.timeline.push({ status, note, timestamp: new Date() });
    refreshEditWindow(order);
    await order.save();
    await Promise.allSettled([
        emitNotification({
            userId: order.userId,
            title: 'Order status updated',
            message: `Your order is now ${CUSTOMER_STATUS_LABELS[status] || status}.`,
            metadata: { orderId: String(order._id), status, note },
        }),
        notifyOperations(
            'Order status changed',
            `Order ${order.orderNumber || String(order._id)} moved to ${status}.`,
            { orderId: String(order._id), status, note, customerId: String(order.userId), vendorId: String(order.vendorId || '') }
        ),
        order.vendorId
            ? emitNotification({
                  userId: String(order.vendorId),
                  title: 'Order updated',
                  message: `Order ${order.orderNumber || String(order._id)} is now ${status}.`,
                  metadata: { orderId: String(order._id), status, note },
              })
            : Promise.resolve(null),
    ]);
    return order;
};

const markPaymentComplete = async (orderId, paymentId) => {
    const order = await Order.findByIdAndUpdate(
        orderId,
        {
            paymentStatus: 'paid',
            paymentId,
            status: 'confirmed',
            customerFacingStatus: CUSTOMER_STATUS_LABELS.confirmed,
            $push: { timeline: { status: 'confirmed', note: 'Payment received' } },
        },
        { new: true }
    );
    if (order) {
        await ensureDeliveryTaskForOrder(order);
        await Promise.allSettled([
            emitNotification({
                userId: order.userId,
                title: 'Payment confirmed',
                message: `Payment received for order ${order.orderNumber || String(order._id)}.`,
                metadata: { orderId: String(order._id), status: order.status, paymentId },
            }),
            notifyOperations(
                'Order payment confirmed',
                `Payment was completed for order ${order.orderNumber || String(order._id)}.`,
                { orderId: String(order._id), status: order.status, paymentId, customerId: String(order.userId) }
            ),
            order.vendorId
                ? emitNotification({
                      userId: String(order.vendorId),
                      title: 'Paid order in queue',
                      message: `Order ${order.orderNumber || String(order._id)} is confirmed and ready for fulfillment.`,
                      metadata: { orderId: String(order._id), status: order.status },
                  })
                : Promise.resolve(null),
        ]);
    }
    return order;
};

const updateDeliveryStatus = async (
    orderId,
    { deliveryStatus, riderId, etaMinutes, distanceKm, mappedOrderStatus }
) => {
    const update = {
        deliveryStatus,
        deliveryEtaMinutes: etaMinutes || 0,
        deliveryDistanceKm: distanceKm || 0,
    };
    if (riderId) update.riderId = riderId;

    // Map delivery status to order status
    const validOrderStatuses = [
        'pending',
        'confirmed',
        'assigned_vendor',
        'vendor_accepted',
        'in_production',
        'qc_pending',
        'ready_for_pickup',
        'delivery_assigned',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'refunded',
    ];
    if (mappedOrderStatus && validOrderStatuses.includes(mappedOrderStatus)) {
        update.status = mappedOrderStatus;
        update.customerFacingStatus = CUSTOMER_STATUS_LABELS[mappedOrderStatus] || '';
        if (mappedOrderStatus === 'delivery_assigned') update.assignedAt = new Date();
        if (mappedOrderStatus === 'delivered') update.deliveredAt = new Date();
    }

    const order = await Order.findByIdAndUpdate(
        orderId,
        {
            ...update,
            $push: {
                timeline: {
                    status: deliveryStatus,
                    note: `Delivery: ${deliveryStatus}`,
                    timestamp: new Date(),
                },
            },
        },
        { new: true }
    );
    if (!order) {
        const err = new Error('Order not found');
        err.statusCode = 404;
        throw err;
    }
    refreshEditWindow(order);
    await order.save();
    await Promise.allSettled([
        emitNotification({
            userId: order.userId,
            title: mappedOrderStatus === 'delivered' ? 'Order delivered' : 'Delivery update',
            message:
                mappedOrderStatus === 'delivered'
                    ? `Order ${order.orderNumber || String(order._id)} has been delivered.`
                    : `Delivery status for order ${order.orderNumber || String(order._id)} changed to ${deliveryStatus}.`,
            metadata: { orderId: String(order._id), status: order.status, deliveryStatus, riderId: riderId || '' },
        }),
        notifyOperations(
            mappedOrderStatus === 'delivered' ? 'Order delivered' : 'Delivery status updated',
            `Order ${order.orderNumber || String(order._id)} delivery is now ${deliveryStatus}.`,
            { orderId: String(order._id), status: order.status, deliveryStatus, riderId: riderId || '', vendorId: String(order.vendorId || '') }
        ),
        order.vendorId
            ? emitNotification({
                  userId: String(order.vendorId),
                  title: 'Delivery progress updated',
                  message: `Order ${order.orderNumber || String(order._id)} delivery is now ${deliveryStatus}.`,
                  metadata: { orderId: String(order._id), status: order.status, deliveryStatus },
              })
            : Promise.resolve(null),
    ]);
    return order;
};

const reorder = async (userId, orderId) => {
    const original = await Order.findOne({ _id: orderId, userId });
    if (!original) {
        const err = new Error('Original order not found');
        err.statusCode = 404;
        throw err;
    }

    const newOrder = await Order.create({
        userId,
        items: original.items,
        shippingAddress: original.shippingAddress,
        pickupShopId: original.pickupShopId,
        subtotal: original.subtotal,
        discount: 0,
        deliveryCharge: original.deliveryCharge,
        total: original.subtotal + original.deliveryCharge,
        notes: `Reorder of ${original.orderNumber}`,
        customerFacingStatus: CUSTOMER_STATUS_LABELS.pending,
        editWindow: buildEditableWindow(new Date()),
        timeline: [{ status: 'pending', note: 'Reorder placed' }],
    });
    await ensureDeliveryTaskForOrder(newOrder);
    await Promise.allSettled([
        emitNotification({
            userId: newOrder.userId,
            title: 'Reorder placed',
            message: `Your reorder ${newOrder.orderNumber || String(newOrder._id)} has been placed.`,
            metadata: { orderId: String(newOrder._id), status: newOrder.status },
        }),
        notifyOperations(
            'Reorder placed',
            `Reorder ${newOrder.orderNumber || String(newOrder._id)} was created.`,
            { orderId: String(newOrder._id), status: newOrder.status, customerId: String(newOrder.userId) }
        ),
    ]);

    return newOrder;
};

const getTrackingView = async (userId, orderId) => {
    const order = await getOrderById(userId, orderId);
    refreshEditWindow(order);
    return {
        orderNumber: order.orderNumber,
        status: order.status,
        customerFacingStatus: CUSTOMER_STATUS_LABELS[order.status] || order.customerFacingStatus,
        paymentStatus: order.paymentStatus,
        timeline: toCustomerSafeOrder(order).timeline,
        shippingAddress: order.shippingAddress,
        editWindow: order.editWindow,
        clarification: order.clarification,
        estimatedDelivery: order.deliveryEtaMinutes || 0,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
    };
};

const getEditWindow = async (userId, orderId) => {
    const order = await getOrderById(userId, orderId);
    refreshEditWindow(order);
    await order.save();
    return order.editWindow;
};

const updateBeforeProduction = async (userId, orderId, payload) => {
    const order = await getOrderById(userId, orderId);
    refreshEditWindow(order);
    if (!order.editWindow?.isEditable) {
        const err = new Error(order.editWindow?.lockedReason || 'Order can no longer be edited');
        err.statusCode = 400;
        throw err;
    }

    if (payload.shippingAddress) {
        order.shippingAddress = normalizeShippingAddress({
            ...order.shippingAddress,
            ...payload.shippingAddress,
        });
    }
    if (typeof payload.notes === 'string') order.notes = payload.notes;
    if (payload.cancelOrder === true) {
        order.status = 'cancelled';
        order.customerFacingStatus = CUSTOMER_STATUS_LABELS.cancelled;
        order.cancelledAt = new Date();
        order.failureReason = payload.reason || 'Cancelled before production';
    }
    order.timeline.push({
        status: payload.cancelOrder === true ? 'cancelled' : 'customer_update',
        note: payload.reason || 'Customer updated order before production',
        timestamp: new Date(),
    });
    refreshEditWindow(order);
    await order.save();
    await emitNotification({
        userId: order.userId,
        title: payload.cancelOrder === true ? 'Order cancelled' : 'Order updated',
        message:
            payload.cancelOrder === true
                ? 'Your order was cancelled before production.'
                : 'Your order changes were saved successfully.',
        metadata: { orderId: String(order._id), status: order.status },
    });
    return order;
};

const requestClarification = async (orderId, requestedByRole, question, dueInMinutes = 30) => {
    const order = await Order.findById(orderId);
    if (!order) {
        const err = new Error('Order not found');
        err.statusCode = 404;
        throw err;
    }
    const dueAt = new Date();
    dueAt.setMinutes(dueAt.getMinutes() + Math.max(5, Number(dueInMinutes) || 30));

    order.clarification = {
        isRequired: true,
        status: 'requested',
        requestedByRole,
        question,
        response: '',
        requestedAt: new Date(),
        respondedAt: null,
        dueAt,
    };
    order.timeline.push({
        status: 'clarification_required',
        note: question,
        timestamp: new Date(),
    });
    await order.save();
    await emitNotification({
        userId: order.userId,
        title: 'Clarification required',
        message: question,
        category: 'support',
        metadata: { orderId: String(order._id), dueAt },
    });
    await notifyOperations(
        'Order clarification requested',
        `Clarification was requested for order ${order.orderNumber || String(order._id)}.`,
        { orderId: String(order._id), dueAt, customerId: String(order.userId), vendorId: String(order.vendorId || '') }
    );
    return order;
};

const respondClarification = async (userId, orderId, response) => {
    const order = await getOrderById(userId, orderId);
    if (!order.clarification?.isRequired) {
        const err = new Error('No clarification requested');
        err.statusCode = 400;
        throw err;
    }
    order.clarification.response = response;
    order.clarification.status = 'responded';
    order.clarification.respondedAt = new Date();
    order.timeline.push({
        status: 'clarification_responded',
        note: 'Customer responded to clarification request',
        timestamp: new Date(),
    });
    await order.save();
    await emitNotification({
        userId: order.userId,
        title: 'Clarification submitted',
        message: 'Your clarification response has been shared with SpeedCopy.',
        category: 'support',
        metadata: { orderId: String(order._id) },
    });
    await notifyOperations(
        'Customer responded to clarification',
        `Customer responded for order ${order.orderNumber || String(order._id)}.`,
        { orderId: String(order._id), customerId: String(order.userId), vendorId: String(order.vendorId || '') }
    );
    return order;
};

// ─── Vendor order methods ─────────────────────────────────

const getVendorQueue = async (vendorId, query) => {
    const { page, limit, skip } = paginate(query);
    const filter = {
        vendorId,
        status: {
            $in: [
                'assigned_vendor',
                'vendor_accepted',
                'in_production',
                'qc_pending',
                'ready_for_pickup',
            ],
        },
    };
    if (query.status) filter.status = query.status;

    const [orders, total] = await Promise.all([
        Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Order.countDocuments(filter),
    ]);

    return { orders, meta: paginateMeta(total, page, limit) };
};

const getVendorOrderById = async (vendorId, orderId) => {
    const order = await Order.findOne({ _id: orderId, vendorId });
    if (!order) {
        const err = new Error('Order not found');
        err.statusCode = 404;
        throw err;
    }
    return order;
};

const VENDOR_STATUS_TRANSITIONS = {
    vendor_accepted: ['assigned_vendor'],
    in_production: ['vendor_accepted'],
    qc_pending: ['in_production'],
    ready_for_pickup: ['qc_pending'],
    cancelled: ['assigned_vendor', 'vendor_accepted'],
};

const vendorUpdateStatus = async (orderId, vendorId, newStatus, note) => {
    const order = await Order.findOne({ _id: orderId, vendorId });
    if (!order) {
        const err = new Error('Order not found or not assigned to you');
        err.statusCode = 404;
        throw err;
    }

    const allowed = VENDOR_STATUS_TRANSITIONS[newStatus] || [];
    if (!allowed.includes(order.status)) {
        const err = new Error(`Cannot transition from ${order.status} to ${newStatus}`);
        err.statusCode = 400;
        throw err;
    }

    const timestampMap = {
        vendor_accepted: 'acceptedAt',
        in_production: 'productionStartedAt',
        qc_pending: 'qcAt',
        ready_for_pickup: 'readyAt',
    };

    const update = {
        status: newStatus,
        customerFacingStatus: CUSTOMER_STATUS_LABELS[newStatus] || order.customerFacingStatus,
        $push: { timeline: { status: newStatus, note, timestamp: new Date() } },
    };
    if (timestampMap[newStatus]) update[timestampMap[newStatus]] = new Date();

    const updatedOrder = await Order.findByIdAndUpdate(orderId, update, { new: true });
    if (updatedOrder && newStatus === 'ready_for_pickup') {
        await ensureDeliveryTaskForOrder(updatedOrder);
    }
    if (updatedOrder) {
        await Promise.allSettled([
            emitNotification({
                userId: updatedOrder.userId,
                title: newStatus === 'cancelled' ? 'Order cancelled' : 'Order production updated',
                message:
                    newStatus === 'cancelled'
                        ? `Your order ${updatedOrder.orderNumber || String(updatedOrder._id)} was cancelled by the vendor.`
                        : `Your order ${updatedOrder.orderNumber || String(updatedOrder._id)} is now ${CUSTOMER_STATUS_LABELS[newStatus] || newStatus}.`,
                metadata: { orderId: String(updatedOrder._id), status: newStatus, note },
            }),
            emitNotification({
                userId: String(vendorId),
                title: 'Queue status updated',
                message: `Order ${updatedOrder.orderNumber || String(updatedOrder._id)} is now ${newStatus}.`,
                metadata: { orderId: String(updatedOrder._id), status: newStatus, note },
            }),
            notifyOperations(
                newStatus === 'cancelled' ? 'Vendor rejected order' : 'Vendor updated order',
                `Order ${updatedOrder.orderNumber || String(updatedOrder._id)} moved to ${newStatus} from the vendor portal.`,
                {
                    orderId: String(updatedOrder._id),
                    status: newStatus,
                    note,
                    customerId: String(updatedOrder.userId),
                    vendorId: String(vendorId),
                }
            ),
        ]);
    }
    return updatedOrder;
};

const getVendorScore = async (vendorId) => {
    // Get all orders for this vendor
    const orders = await Order.find({ vendorId });

    // Calculate metrics
    const totalOrders = orders.length;
    const assignedOrders = orders.filter(o => o.status === 'assigned_vendor').length;
    const acceptedOrders = orders.filter(o => ['vendor_accepted', 'in_production', 'qc_pending', 'ready_for_pickup', 'out_for_delivery', 'delivered'].includes(o.status)).length;
    const rejectedOrders = orders.filter(o => o.status === 'cancelled' && o.vendorId).length;
    const completedOrders = orders.filter(o => o.status === 'delivered').length;

    // Calculate acceptance rate
    const acceptanceRate = totalOrders > 0 ? Math.round((acceptedOrders / totalOrders) * 100) : 100;

    // Calculate SLA compliance (orders ready within 24 hours)
    const ordersWithTimestamps = orders.filter(o => o.acceptedAt && o.readyAt);
    const slaCompliantOrders = ordersWithTimestamps.filter(o => {
        const timeDiff = new Date(o.readyAt) - new Date(o.acceptedAt);
        return timeDiff <= 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    }).length;
    const slaCompliance = ordersWithTimestamps.length > 0
        ? Math.round((slaCompliantOrders / ordersWithTimestamps.length) * 100)
        : 100;

    // Calculate overall score (weighted average)
    const overallScore = Math.round((acceptanceRate * 0.4) + (slaCompliance * 0.6));

    // Determine routing priority
    let routingPriority = 'Low';
    if (overallScore >= 90) routingPriority = 'High';
    else if (overallScore >= 70) routingPriority = 'Medium';

    // Metrics for display
    const metrics = [
        {
            label: 'Acceptance Rate',
            value: `${acceptanceRate}%`,
            target: '95%',
            num: acceptanceRate,
            status: acceptanceRate >= 95 ? 'good' : 'needs_attention',
            desc: 'Percentage of orders accepted vs total assigned'
        },
        {
            label: 'SLA Compliance',
            value: `${slaCompliance}%`,
            target: '90%',
            num: slaCompliance,
            status: slaCompliance >= 90 ? 'good' : 'needs_attention',
            desc: 'Orders completed within 24 hours'
        },
        {
            label: 'Total Orders',
            value: String(totalOrders),
            target: '100+',
            num: Math.min(100, totalOrders),
            status: totalOrders >= 100 ? 'good' : 'needs_attention',
            desc: 'Total orders processed'
        },
        {
            label: 'Rejection Rate',
            value: `${totalOrders > 0 ? Math.round((rejectedOrders / totalOrders) * 100) : 0}%`,
            target: '<5%',
            num: totalOrders > 0 ? Math.round((rejectedOrders / totalOrders) * 100) : 0,
            status: (rejectedOrders / totalOrders) < 0.05 ? 'good' : 'needs_attention',
            desc: 'Percentage of orders rejected'
        }
    ];

    // Radar chart data
    const radarData = [
        { metric: 'Acceptance', score: acceptanceRate, target: 95 },
        { metric: 'SLA', score: slaCompliance, target: 90 },
        { metric: 'Quality', score: 85, target: 90 },
        { metric: 'Speed', score: 80, target: 85 },
        { metric: 'Volume', score: Math.min(100, totalOrders), target: 100 }
    ];

    // Score trend (last 6 weeks - mock data for now)
    const scoreTrend = [
        { week: 'Week 1', score: Math.max(50, overallScore - 15) },
        { week: 'Week 2', score: Math.max(55, overallScore - 12) },
        { week: 'Week 3', score: Math.max(60, overallScore - 10) },
        { week: 'Week 4', score: Math.max(65, overallScore - 7) },
        { week: 'Week 5', score: Math.max(70, overallScore - 3) },
        { week: 'Week 6', score: overallScore }
    ];

    // Rejection history
    const rejectedOrdersList = orders
        .filter(o => o.status === 'cancelled' && o.vendorId)
        .slice(0, 10)
        .map(o => ({
            id: o.orderNumber || o._id.toString(),
            reason: o.timeline.find(t => t.status === 'cancelled')?.note || 'No reason provided',
            date: o.updatedAt ? new Date(o.updatedAt).toLocaleDateString() : 'N/A',
            counted: true
        }));

    return {
        overallScore,
        routingPriority,
        acceptanceRate,
        slaCompliance,
        metrics,
        radarData,
        scoreTrend,
        rejectionHistory: rejectedOrdersList,
        totals: {
            total: totalOrders,
            accepted: acceptedOrders,
            rejected: rejectedOrders,
            completed: completedOrders
        }
    };
};

const getVendorClosure = async (vendorId, period = 'daily', dateStr) => {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    let startDate, endDate;

    // Calculate date range based on period
    if (period === 'daily') {
        startDate = new Date(targetDate.setHours(0, 0, 0, 0));
        endDate = new Date(targetDate.setHours(23, 59, 59, 999));
    } else if (period === 'weekly') {
        const dayOfWeek = targetDate.getDay();
        startDate = new Date(targetDate);
        startDate.setDate(targetDate.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
    } else { // monthly
        startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Get orders in the date range
    const orders = await Order.find({
        vendorId,
        createdAt: { $gte: startDate, $lte: endDate }
    });

    // Calculate summary
    const totalJobs = orders.length;
    const completedJobs = orders.filter(o => ['delivered', 'ready_for_pickup'].includes(o.status)).length;
    const deliveredJobs = orders.filter(o => o.status === 'delivered').length;
    const totalEarnings = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const avgOrderValue = totalJobs > 0 ? Math.round(totalEarnings / totalJobs) : 0;

    // Group by store
    const storeMap = new Map();
    orders.forEach(order => {
        const storeId = order.storeId || 'unassigned';
        const current = storeMap.get(storeId) || { jobs: 0, earnings: 0 };
        current.jobs += 1;
        current.earnings += order.total || 0;
        storeMap.set(storeId, current);
    });

    const storeBreakdown = Array.from(storeMap.entries()).map(([storeId, data]) => ({
        storeId,
        jobs: data.jobs,
        earnings: data.earnings,
        percentage: totalEarnings > 0 ? Math.round((data.earnings / totalEarnings) * 100) : 0
    }));

    // Chart data (group by day/week based on period)
    const chartMap = new Map();
    orders.forEach(order => {
        const date = new Date(order.createdAt);
        let key;
        if (period === 'daily') {
            key = `${date.getHours()}:00`;
        } else if (period === 'weekly') {
            key = date.toLocaleDateString('en-US', { weekday: 'short' });
        } else {
            key = `Day ${date.getDate()}`;
        }
        const current = chartMap.get(key) || { period: key, earnings: 0 };
        current.earnings += order.total || 0;
        chartMap.set(key, current);
    });

    const chartData = Array.from(chartMap.values());

    // Recent closed jobs
    const jobs = orders
        .filter(o => ['delivered', 'ready_for_pickup'].includes(o.status))
        .slice(0, 10)
        .map(o => ({
            id: o.orderNumber || o._id.toString(),
            type: o.items?.[0]?.productName || 'Order',
            storeId: o.storeId || 'unassigned',
            amount: o.total || 0,
            status: o.status,
            completedAt: o.readyAt || o.updatedAt || o.createdAt
        }));

    return {
        summary: {
            totalJobs,
            completedJobs,
            deliveredJobs,
            totalEarnings,
            avgOrderValue
        },
        storeBreakdown,
        chartData,
        jobs
    };
};

module.exports = {
    createOrder,
    getInternalOrderSnapshot,
    getOrderById,
    getCustomerOrderDetail,
    getUserOrders,
    getUserOrderSummary,
    updateOrderStatus,
    markPaymentComplete,
    updateDeliveryStatus,
    reorder,
    getVendorQueue,
    getVendorOrderById,
    vendorUpdateStatus,
    getTrackingView,
    getEditWindow,
    updateBeforeProduction,
    requestClarification,
    respondClarification,
    getVendorScore,
    getVendorClosure,
};
