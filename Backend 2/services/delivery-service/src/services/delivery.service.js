const { config } = require('../config/index');
const { DeliveryTask } = require('../models/DeliveryTask.model');
const DeliveryPartnerProfile = require('../models/DeliveryPartnerProfile.model');
const { computeGoogleRoute, resolveStopLocation } = require('./google-maps.service');

const ACTIVE_TASK_STATUSES = ['assigned', 'arrived_pickup', 'picked', 'out_for_delivery', 'sos'];

const toKilometers = (m) => Number((m / 1000).toFixed(1));
const toMinutes = (s) => Math.max(1, Math.ceil(s / 60));
const roundCurrency = (value) => Number(Number(value || 0).toFixed(2));
const lastLocationUpdate = (task) => {
    const u = Array.isArray(task.locationUpdates) ? task.locationUpdates : [];
    return u.length ? u[u.length - 1] : null;
};
const activeDestinationType = (status) =>
    status === 'assigned' || status === 'arrived_pickup' ? 'pickup' : 'dropoff';
const activeDestination = (task) =>
    activeDestinationType(task.status) === 'pickup' ? task.pickup : task.dropoff;
const sanitizeStop = (stop) => ({
    ...(stop || {}),
    contactName: stop?.contactName ? 'SpeedCopy Support' : '',
    contactPhone: stop?.contactPhone ? 'hidden' : '',
});
const totalTaskItems = (items = []) =>
    items.reduce((sum, item) => sum + Number(item?.quantity || 0), 0);
const payoutRatesForTask = (task, profile) => ({
    perOrderRate: Number(profile?.payoutRatePerOrder ?? task?.payoutRatePerOrder ?? config.DELIVERY_PAYOUT_BASE),
    perKmRate: Number(profile?.payoutRatePerKm ?? task?.payoutRatePerKm ?? config.DELIVERY_PAYOUT_PER_KM),
    perItemRate: Number(task?.payoutRatePerItem ?? config.DELIVERY_PAYOUT_PER_ITEM),
});
const calculateEstimatedPayout = ({
    distanceKm = 0,
    itemCount = 0,
    perOrderRate = config.DELIVERY_PAYOUT_BASE,
    perKmRate = config.DELIVERY_PAYOUT_PER_KM,
    perItemRate = config.DELIVERY_PAYOUT_PER_ITEM,
}) =>
    roundCurrency(
        Number(perOrderRate || 0) +
            Number(distanceKm || 0) * Number(perKmRate || 0) +
            Number(itemCount || 0) * Number(perItemRate || 0)
    );
const buildDeliveryTaskItemId = (item, index) => {
    const base = String(item?.itemId || item?.title || 'item').trim();
    return `${base}:line-${index + 1}`;
};
const normalizeTaskItems = (items = []) => {
    const seen = new Set();

    return items.map((item, index) => {
        let nextItemId = String(item?.itemId || '').trim();

        if (!nextItemId || seen.has(nextItemId)) {
            nextItemId = buildDeliveryTaskItemId(item, index);
        }

        while (seen.has(nextItemId)) {
            nextItemId = `${nextItemId}:dup-${index + 1}`;
        }

        seen.add(nextItemId);

        return {
            itemId: nextItemId,
            title: item.title,
            subtitle: item.subtitle || '',
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice || 0),
            totalPrice: Number(item.totalPrice || 0),
            thumbnail: item.thumbnail || '',
            checkedAtPickup: false,
        };
    });
};
const syncEstimatedPayout = (task, profile) => {
    const rates = payoutRatesForTask(task, profile);
    task.payoutRatePerOrder = rates.perOrderRate;
    task.payoutRatePerKm = rates.perKmRate;
    task.payoutRatePerItem = rates.perItemRate;
    task.estimatedPayout = calculateEstimatedPayout({
        distanceKm: task.distanceKm || 0,
        itemCount: totalTaskItems(task.items),
        ...rates,
    });
};

const enrichStops = async ({ pickup, dropoff }) => {
    const [p, d] = await Promise.all([resolveStopLocation(pickup), resolveStopLocation(dropoff)]);
    return { pickup: p, dropoff: d };
};

const buildRouteSummary = (input) => computeGoogleRoute(input);

const syncTaskRoute = async (task, origin) => {
    const nextStop = activeDestination(task);
    const actualOrigin =
        origin || lastLocationUpdate(task) || task.pickup?.location || task.dropoff?.location;
    const oLat = Number(actualOrigin?.lat),
        oLng = Number(actualOrigin?.lng);
    const dLat = Number(nextStop?.location?.lat),
        dLng = Number(nextStop?.location?.lng);
    if (
        !Number.isFinite(oLat) ||
        !Number.isFinite(oLng) ||
        !Number.isFinite(dLat) ||
        !Number.isFinite(dLng)
    ) {
        return task.route || null;
    }
    const route = await buildRouteSummary({
        origin: { lat: oLat, lng: oLng },
        destination: { lat: dLat, lng: dLng },
        destinationType: activeDestinationType(task.status),
    });
    if (!route) return task.route || null;
    task.route = route;
    task.etaMinutes = toMinutes(route.durationSeconds);
    task.distanceKm = toKilometers(route.distanceMeters);
    return route;
};

const emitRealtime = async (payload) => {
    if (!config.REALTIME_SERVICE_URL || !config.INTERNAL_SERVICE_TOKEN) return;
    await fetch(`${config.REALTIME_SERVICE_URL}/internal/events`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-internal-token': config.INTERNAL_SERVICE_TOKEN,
        },
        body: JSON.stringify({
            event: payload.event,
            userId: payload.userId,
            room: payload.room,
            payload: payload.data,
        }),
    }).catch(() => null);
};

const emitNotification = async (payload) => {
    if (!config.NOTIFICATION_SERVICE_URL || !config.INTERNAL_SERVICE_TOKEN) return;
    await fetch(`${config.NOTIFICATION_SERVICE_URL}/api/notifications/internal`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-internal-token': config.INTERNAL_SERVICE_TOKEN,
        },
        body: JSON.stringify(payload),
    }).catch(() => null);
};

const fetchOrderSnapshot = async (orderId) => {
    if (!config.ORDER_SERVICE_URL || !config.INTERNAL_SERVICE_TOKEN || !orderId) return null;

    try {
        const response = await fetch(
            `${config.ORDER_SERVICE_URL}/api/orders/internal/${orderId}/snapshot`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-internal-token': config.INTERNAL_SERVICE_TOKEN,
                },
            }
        );

        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success || !payload?.data) {
            return null;
        }

        return payload.data;
    } catch {
        return null;
    }
};

const syncOrderDeliveryStatus = async (task) => {
    if (!config.INTERNAL_SERVICE_TOKEN) return;
    const statusMap = {
        delivered: 'delivered',
        picked: 'in_transit',
        out_for_delivery: 'in_transit',
        assigned: 'confirmed',
        arrived_pickup: 'confirmed',
    };
    await fetch(`${config.ORDER_SERVICE_URL}/api/orders/${task.orderId}/delivery-status`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'x-internal-token': config.INTERNAL_SERVICE_TOKEN,
        },
        body: JSON.stringify({
            deliveryStatus: task.status,
            riderId: task.riderId || '',
            etaMinutes: task.etaMinutes || 0,
            distanceKm: task.distanceKm || 0,
            mappedOrderStatus: statusMap[task.status] || 'placed',
        }),
    }).catch(() => null);
};

const emitTaskEvent = async (task, event, extra = {}) => {
    const payload = {
        taskId: String(task._id),
        orderId: task.orderId,
        status: task.status,
        riderId: task.riderId || '',
        customerId: task.customerId,
        etaMinutes: task.etaMinutes || 0,
        distanceKm: task.distanceKm || 0,
        route: task.route || null,
        ...extra,
    };
    await Promise.allSettled([
        emitRealtime({ event, userId: task.customerId, room: 'admins', data: payload }),
        ...(task.riderId
            ? [emitRealtime({ event, userId: task.riderId, room: 'admins', data: payload })]
            : []),
        emitRealtime({ event, room: `task:${String(task._id)}`, data: payload }),
    ]);
};

const sanitizeTask = (task) => {
    const latestLocation = lastLocationUpdate(task);
    const destinationType = activeDestinationType(task.status);
    const destination = activeDestination(task);
    return {
        id: String(task._id),
        orderId: task.orderId,
        customerId: task.customerId,
        riderId: task.riderId || '',
        activeAssignment: Boolean(task.activeAssignment),
        status: task.status,
        destinationType,
        destination: sanitizeStop(destination),
        destinationLocation: destination?.location || null,
        destinationAddressLine: destination?.addressLine || '',
        pickup: sanitizeStop(task.pickup),
        dropoff: sanitizeStop(task.dropoff),
        items: task.items || [],
        orderNumber: task.orderNumber || '',
        orderSubtotal: Number(task.orderSubtotal || 0),
        deliveryCharge: Number(task.deliveryCharge || 0),
        orderTotal: Number(task.orderTotal || 0),
        specialInstructions: task.specialInstructions || '',
        etaMinutes: task.etaMinutes || 0,
        distanceKm: task.distanceKm || 0,
        estimatedPayout: Number(task.estimatedPayout || 0),
        chatThreadId: task.chatThreadId || '',
        route: task.route || null,
        proofOfDelivery: task.proofOfDelivery || null,
        failureInfo: task.failureInfo || null,
        latestLocation: latestLocation
            ? {
                  lat: latestLocation.lat,
                  lng: latestLocation.lng,
                  heading: latestLocation.heading || 0,
                  speedKmph: latestLocation.speedKmph || 0,
                  at: latestLocation.at,
              }
            : null,
        locationUpdates: task.locationUpdates || [],
        history: task.history || [],
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
    };
};

const getOrCreatePartnerProfile = async (userId) => {
    let profile = await DeliveryPartnerProfile.findOne({ userId });
    if (!profile) profile = await DeliveryPartnerProfile.create({ userId });
    return profile;
};

const createDeliveryTaskInternal = async (input) => {
    const { pickup, dropoff } = await enrichStops({ pickup: input.pickup, dropoff: input.dropoff });
    const baseRoute = await buildRouteSummary({
        origin: pickup.location,
        destination: dropoff.location,
        destinationType: 'dropoff',
    });
    const nextDistanceKm = baseRoute?.distanceMeters
        ? toKilometers(baseRoute.distanceMeters)
        : input.distanceKm || 0;
    const payoutRatePerOrder = Number(config.DELIVERY_PAYOUT_BASE || 0);
    const payoutRatePerKm = Number(config.DELIVERY_PAYOUT_PER_KM || 0);
    const payoutRatePerItem = Number(config.DELIVERY_PAYOUT_PER_ITEM || 0);
    const itemCount = totalTaskItems(input.items);
    const estimatedPayout =
        input.estimatedPayout && Number(input.estimatedPayout) > 0
            ? roundCurrency(input.estimatedPayout)
            : calculateEstimatedPayout({
                  distanceKm: nextDistanceKm,
                  itemCount,
                  perOrderRate: payoutRatePerOrder,
                  perKmRate: payoutRatePerKm,
                  perItemRate: payoutRatePerItem,
              });

    const task = await DeliveryTask.findOneAndUpdate(
        { orderId: input.orderId },
        {
            $set: {
                customerId: input.customerId,
                status: 'pending_assignment',
                pickup,
                dropoff,
                items: normalizeTaskItems(input.items || []),
                orderNumber: input.orderNumber || '',
                orderSubtotal: Number(input.orderSubtotal || 0),
                deliveryCharge: Number(input.deliveryCharge || 0),
                orderTotal: Number(input.orderTotal || 0),
                specialInstructions: input.specialInstructions || '',
                etaMinutes: baseRoute?.durationSeconds
                    ? toMinutes(baseRoute.durationSeconds)
                    : input.etaMinutes || 0,
                distanceKm: nextDistanceKm,
                estimatedPayout,
                payoutRatePerOrder,
                payoutRatePerKm,
                payoutRatePerItem,
                route: baseRoute || {},
                activeAssignment: false,
            },
            $setOnInsert: { riderId: '' },
            $push: {
                history: { status: 'pending_assignment', at: new Date(), note: 'Task created' },
            },
        },
        { upsert: true, new: true }
    );

    await Promise.allSettled([
        syncOrderDeliveryStatus(task),
        emitTaskEvent(task, 'delivery.task.created'),
    ]);
    return sanitizeTask(task);
};

const listAvailableTasks = async (page = 1, limit = 20) => {
    const safePage = Math.max(1, page),
        safeLimit = Math.min(50, Math.max(1, limit));
    const [items, total] = await Promise.all([
        DeliveryTask.find({ status: 'pending_assignment' })
            .sort({ updatedAt: -1 })
            .skip((safePage - 1) * safeLimit)
            .limit(safeLimit),
        DeliveryTask.countDocuments({ status: 'pending_assignment' }),
    ]);
    const hydratedItems = await Promise.all(items.map((item) => hydrateTaskFinancials(item)));
    return {
        items: hydratedItems.map(sanitizeTask),
        pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            totalPages: Math.max(1, Math.ceil(total / safeLimit)),
        },
    };
};

const acceptTask = async (taskId, riderId) => {
    const profile = await getOrCreatePartnerProfile(riderId);
    if (!profile.isAvailable) throw new Error('Set availability ON before accepting jobs');
    // Temporary relaxation: allow riders with submitted/pending KYC to take jobs.
    if (profile.kycStatus === 'rejected') {
        throw new Error('Identity verification approval required');
    }

    const existing = await DeliveryTask.findOne({ riderId, status: { $in: ACTIVE_TASK_STATUSES } });
    if (existing && String(existing._id) !== taskId)
        throw new Error('Complete current delivery before accepting a new one');

    const task = await DeliveryTask.findOneAndUpdate(
        { _id: taskId, status: 'pending_assignment' },
        {
            $set: { riderId, status: 'assigned', activeAssignment: true },
            $push: { history: { status: 'assigned', at: new Date(), note: 'Rider accepted task' } },
        },
        { new: true }
    );
    if (!task) {
        const current = await DeliveryTask.findById(taskId);
        if (!current) throw new Error('Delivery task not found');
        if (current.riderId === riderId) {
            await hydrateTaskFinancials(current);
            return sanitizeTask(current);
        }
        throw new Error('Task is already assigned');
    }

    syncEstimatedPayout(task, profile);
    await hydrateTaskFinancials(task);
    await syncTaskRoute(task, task.pickup?.location);
    await task.save();
    await Promise.allSettled([
        syncOrderDeliveryStatus(task),
        emitTaskEvent(task, 'delivery.task.assigned'),
        emitNotification({
            userId: task.customerId,
            type: 'delivery_assigned',
            title: 'Rider assigned',
            message: 'A delivery partner has been assigned to your order.',
            metadata: { orderId: task.orderId, riderId },
        }),
    ]);
    return sanitizeTask(task);
};

const rejectTask = async (taskId, riderId, reason) => {
    if (!reason) throw new Error('Rejection reason is required');

    const task = await DeliveryTask.findOne({ _id: taskId });
    if (!task) throw new Error('Delivery task not found');
    if (task.status !== 'pending_assignment') throw new Error('Task can no longer be rejected');

    task.status = 'rejected';
    task.activeAssignment = false;
    task.history.push({
        status: 'rejected',
        at: new Date(),
        note: `Rejected by rider ${riderId}: ${reason}`,
    });
    await task.save();
    await emitTaskEvent(task, 'delivery.task.rejected', { riderId, reason });
    return sanitizeTask(task);
};

const getTaskById = async (taskId) => {
    const task = await DeliveryTask.findById(taskId);
    if (!task) return null;
    await hydrateTaskFinancials(task);
    return sanitizeTask(task);
};

const getCurrentTaskForRider = async (riderId) => {
    const task = await DeliveryTask.findOne({ riderId, status: { $in: ACTIVE_TASK_STATUSES } }).sort({
        updatedAt: -1,
    });
    if (!task) return null;
    await hydrateTaskFinancials(task);
    return sanitizeTask(task);
};

const listRiderTasks = async (riderId, status, page = 1, limit = 20) => {
    const safePage = Math.max(1, page),
        safeLimit = Math.min(50, Math.max(1, limit));
    const filters = { riderId };
    if (status) filters.status = status;
    const [items, total] = await Promise.all([
        DeliveryTask.find(filters)
            .sort({ updatedAt: -1 })
            .skip((safePage - 1) * safeLimit)
            .limit(safeLimit),
        DeliveryTask.countDocuments(filters),
    ]);
    const hydratedItems = await Promise.all(items.map((item) => hydrateTaskFinancials(item)));
    return {
        items: hydratedItems.map(sanitizeTask),
        pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            totalPages: Math.max(1, Math.ceil(total / safeLimit)),
        },
    };
};

const markArrivedPickup = async (taskId, riderId) => {
    const task = await DeliveryTask.findOne({ _id: taskId, riderId });
    if (!task) throw new Error('Delivery task not found');
    task.status = 'arrived_pickup';
    task.history.push({
        status: 'arrived_pickup',
        at: new Date(),
        note: 'Rider arrived at pickup',
    });
    await syncTaskRoute(task);
    await task.save();
    await Promise.allSettled([
        syncOrderDeliveryStatus(task),
        emitTaskEvent(task, 'delivery.task.arrived_pickup'),
    ]);
    return sanitizeTask(task);
};

const confirmPickup = async (taskId, riderId, checkedItemIds) => {
    const task = await DeliveryTask.findOne({ _id: taskId, riderId });
    if (!task) throw new Error('Delivery task not found');
    const checkedSet = new Set((checkedItemIds || []).map(String));
    task.items = task.items.map((item) => ({
        ...item.toObject(),
        checkedAtPickup: checkedSet.has(item.itemId),
    }));
    task.status = 'out_for_delivery';
    task.history.push({ status: 'picked', at: new Date(), note: 'Pickup confirmed' });
    task.history.push({
        status: 'out_for_delivery',
        at: new Date(),
        note: 'Rider started delivery route',
    });
    task.activeAssignment = true;
    await syncTaskRoute(task);
    await task.save();
    await Promise.allSettled([
        syncOrderDeliveryStatus(task),
        emitTaskEvent(task, 'delivery.task.out_for_delivery'),
        emitNotification({
            userId: task.customerId,
            type: 'delivery_out_for_delivery',
            title: 'Order on the way',
            message: 'Your order is out for delivery.',
            metadata: { orderId: task.orderId },
        }),
    ]);
    return sanitizeTask(task);
};

const updateLiveLocation = async (taskId, riderId, payload) => {
    const task = await DeliveryTask.findOne({ _id: taskId, riderId });
    if (!task) throw new Error('Delivery task not found');
    task.locationUpdates.push({
        at: new Date(),
        lat: payload.lat,
        lng: payload.lng,
        heading: Number(payload.heading || 0),
        speedKmph: Number(payload.speedKmph || 0),
        etaMinutes: Number(payload.etaMinutes || 0),
        distanceKm: Number(payload.distanceKm || 0),
    });
    if (task.locationUpdates.length > 200) task.locationUpdates = task.locationUpdates.slice(-200);
    const route = await syncTaskRoute(task, { lat: payload.lat, lng: payload.lng });
    task.etaMinutes = route?.durationSeconds
        ? toMinutes(route.durationSeconds)
        : Number(payload.etaMinutes || task.etaMinutes || 0);
    task.distanceKm = route?.distanceMeters
        ? toKilometers(route.distanceMeters)
        : Number(payload.distanceKm || task.distanceKm || 0);
    await task.save();
    await emitRealtime({
        event: 'delivery.location.updated',
        userId: task.customerId,
        room: `task:${String(task._id)}`,
        data: {
            taskId: String(task._id),
            orderId: task.orderId,
            riderId: task.riderId,
            lat: payload.lat,
            lng: payload.lng,
            etaMinutes: task.etaMinutes,
            distanceKm: task.distanceKm,
        },
    });
    return sanitizeTask(task);
};

const markDelivered = async (taskId, riderId) => {
    const task = await DeliveryTask.findOne({ _id: taskId, riderId });
    if (!task) throw new Error('Delivery task not found');
    task.status = 'delivered';
    task.activeAssignment = false;
    task.route = {};
    task.history.push({ status: 'delivered', at: new Date(), note: 'Delivery completed' });
    await task.save();
    await Promise.allSettled([
        syncOrderDeliveryStatus(task),
        emitTaskEvent(task, 'delivery.task.delivered'),
        emitNotification({
            userId: task.customerId,
            type: 'delivery_delivered',
            title: 'Order delivered',
            message: 'Your order has been delivered successfully.',
            metadata: { orderId: task.orderId },
        }),
    ]);
    return sanitizeTask(task);
};

const submitDeliveryProof = async (taskId, riderId, payload) => {
    const task = await DeliveryTask.findOne({ _id: taskId, riderId });
    if (!task) throw new Error('Delivery task not found');

    task.proofOfDelivery = {
        otp: payload.otp || '',
        photoUrl: payload.photoUrl || '',
        confirmedAt: new Date(),
        notes: payload.notes || '',
    };
    task.status = 'delivered';
    task.activeAssignment = false;
    task.route = {};
    task.history.push({
        status: 'delivered',
        at: new Date(),
        note: 'Proof of delivery captured',
    });
    await task.save();

    await Promise.allSettled([
        syncOrderDeliveryStatus(task),
        emitTaskEvent(task, 'delivery.task.proof_captured'),
    ]);
    return sanitizeTask(task);
};

const markDeliveryFailure = async (taskId, riderId, reason, note = '') => {
    if (!reason) throw new Error('Failure reason is required');
    const task = await DeliveryTask.findOne({ _id: taskId, riderId });
    if (!task) throw new Error('Delivery task not found');

    task.status = 'failed';
    task.activeAssignment = false;
    task.failureInfo = {
        reason,
        note,
        failedAt: new Date(),
    };
    task.history.push({
        status: 'failed',
        at: new Date(),
        note: `${reason}${note ? `: ${note}` : ''}`,
    });
    await task.save();

    await Promise.allSettled([
        emitTaskEvent(task, 'delivery.task.failed', { reason, note }),
        emitNotification({
            userId: task.customerId,
            type: 'delivery_failed',
            title: 'Delivery issue reported',
            message: 'Your order delivery hit an issue and is being reviewed by SpeedCopy.',
            metadata: { orderId: task.orderId, reason, note },
        }),
    ]);
    return sanitizeTask(task);
};

const getAvailability = async (riderId) => getOrCreatePartnerProfile(riderId);

const updateAvailability = async (riderId, isAvailable) => {
    const profile = await getOrCreatePartnerProfile(riderId);
    profile.isAvailable = Boolean(isAvailable);
    await profile.save();
    return profile;
};

const submitIdentityVerification = async (riderId, payload) => {
    const profile = await getOrCreatePartnerProfile(riderId);
    profile.identityVerification = {
        idDocumentUrl: payload.idDocumentUrl || '',
        selfieUrl: payload.selfieUrl || '',
        submittedAt: new Date(),
    };
    if (profile.kycStatus === 'rejected') profile.kycStatus = 'pending';
    await profile.save();
    return profile;
};

const getEarningsSummary = async (riderId) => {
    let financeData = null;
    if (config.FINANCE_SERVICE_URL) {
        financeData = await fetch(`${config.FINANCE_SERVICE_URL}/api/delivery/earnings/summary`, {
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': riderId,
                'x-user-role': 'delivery_partner',
            },
        }).then((response) => response.json().catch(() => null));
    }

    if (financeData && financeData.data) {
        return financeData.data;
    }

    // Fallback: Calculate locally based on completed tasks
    const completedTasks = await DeliveryTask.find({ riderId, status: 'delivered' }).sort({ updatedAt: -1 }).lean();
    let today = 0, week = 0, total = 0;
    const now = new Date();
    
    completedTasks.forEach(task => {
        const payout = task.estimatedPayout || 0;
        total += payout;
        if (task.updatedAt) {
            const taskDate = new Date(task.updatedAt);
            const diffDays = (now - taskDate) / (1000 * 60 * 60 * 24);
            if (diffDays < 1 && now.getDate() === taskDate.getDate()) today += payout;
            if (diffDays < 7) week += payout;
        }
    });

    return { 
        summary: { today, week, total }, 
        recent_jobs: completedTasks.slice(0, 10).map(sanitizeTask) 
    };
};

const taskNeedsOrderFinancialBackfill = (task) => {
    const hasOrderTotals =
        Number(task?.orderTotal || 0) > 0 || Number(task?.orderSubtotal || 0) > 0;
    const hasItemPricing = Array.isArray(task?.items)
        ? task.items.some(
              (item) =>
                  Number(item?.unitPrice || 0) > 0 || Number(item?.totalPrice || 0) > 0
          )
        : false;

    return !hasOrderTotals || !hasItemPricing;
};

const hydrateTaskFinancials = async (task) => {
    if (!task || !taskNeedsOrderFinancialBackfill(task)) return task;

    const snapshot = await fetchOrderSnapshot(task.orderId);
    if (!snapshot) return task;

    const orderItems = [...(snapshot.items || [])];
    let hasChanges = false;

    task.orderNumber = task.orderNumber || snapshot.orderNumber || '';
    task.orderSubtotal = Number(task.orderSubtotal || snapshot.subtotal || 0);
    task.deliveryCharge = Number(task.deliveryCharge || snapshot.deliveryCharge || 0);
    task.orderTotal = Number(task.orderTotal || snapshot.total || 0);

    task.items = (task.items || []).map((item) => {
        const baseItemId = String(item.itemId || '').split(':')[0];
        const matchedIndex = orderItems.findIndex(
            (orderItem) =>
                String(orderItem.productId || orderItem.itemId || '') === baseItemId ||
                String(orderItem.productName || '').trim().toLowerCase() ===
                    String(item.title || '').trim().toLowerCase()
        );

        if (matchedIndex === -1) {
            return item;
        }

        const matched = orderItems.splice(matchedIndex, 1)[0];
        const nextUnitPrice = Number(item.unitPrice || matched.unitPrice || 0);
        const nextTotalPrice = Number(item.totalPrice || matched.totalPrice || 0);
        const nextThumbnail = item.thumbnail || matched.thumbnail || '';

        if (
            Number(item.unitPrice || 0) !== nextUnitPrice ||
            Number(item.totalPrice || 0) !== nextTotalPrice ||
            String(item.thumbnail || '') !== nextThumbnail
        ) {
            hasChanges = true;
        }

        return {
            ...item,
            title: item.title || matched.productName,
            quantity: Number(item.quantity || matched.quantity || 1),
            unitPrice: nextUnitPrice,
            totalPrice: nextTotalPrice,
            thumbnail: nextThumbnail,
        };
    });

    if (typeof task.save === 'function' && hasChanges) {
        await task.save().catch(() => null);
    }

    return task;
};

const raiseSos = async (taskId, riderId, message) => {
    const task = await DeliveryTask.findOne({ _id: taskId, riderId });
    if (!task) throw new Error('Delivery task not found');
    task.status = 'sos';
    task.activeAssignment = true;
    task.history.push({ status: 'sos', at: new Date(), note: message || 'SOS triggered by rider' });
    await task.save();
    await Promise.allSettled([emitTaskEvent(task, 'delivery.task.sos', { message })]);
    return sanitizeTask(task);
};

const SupportTicket = require('../models/SupportTicket.model');

const mapIncidentCategory = (issueType = '') => {
    const normalized = String(issueType || '').toLowerCase();

    if (normalized.includes('payment')) return 'payment_issue';
    if (normalized.includes('account')) return 'account_issue';
    if (
        normalized.includes('order') ||
        normalized.includes('delivery') ||
        normalized.includes('vehicle') ||
        normalized.includes('safety')
    ) {
        return 'delivery_issue';
    }

    return 'other';
};

const mapIncidentPriority = (issueType = '') => {
    const normalized = String(issueType || '').toLowerCase();

    if (normalized.includes('safety') || normalized.includes('emergency')) return 'urgent';
    if (normalized.includes('vehicle') || normalized.includes('order')) return 'high';
    return 'medium';
};

const buildIncidentSubject = (issueType = '') => {
    const cleaned = String(issueType || '')
        .replace(/[_-]+/g, ' ')
        .trim();

    if (!cleaned) return 'Delivery partner incident';

    return `Delivery incident: ${cleaned
        .split(' ')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')}`;
};

const resolveIncidentTask = async (riderId, taskId) => {
    if (taskId) {
        const task = await DeliveryTask.findOne({ _id: taskId, riderId }).lean();
        if (!task) throw new Error('Linked delivery task not found');
        return task;
    }

    return DeliveryTask.findOne({ riderId, status: { $in: ACTIVE_TASK_STATUSES } })
        .sort({ updatedAt: -1 })
        .lean();
};

const createOpsTicket = async (riderId, payload) => {
    if (!config.NOTIFICATION_SERVICE_URL) return null;

    const response = await fetch(`${config.NOTIFICATION_SERVICE_URL}/api/notifications/tickets`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-user-id': riderId,
            'x-user-role': 'delivery_partner',
        },
        body: JSON.stringify({
            subject: buildIncidentSubject(payload.issueType),
            description: payload.description,
            category: mapIncidentCategory(payload.issueType),
            priority: mapIncidentPriority(payload.issueType),
            orderId: payload.orderId || '',
            attachments: payload.photoUrls || [],
            metadata: {
                issueType: payload.issueType,
                taskId: payload.taskId || '',
                riderId,
                linkedOrderId: payload.orderId || '',
                location: payload.location || null,
                source: 'delivery_service_incident',
            },
        }),
    }).catch(() => null);

    if (!response?.ok) return null;

    const json = await response.json().catch(() => null);
    return json?.data || null;
};

const raiseSupportIncident = async (riderId, payload) => {
    const linkedTask = await resolveIncidentTask(riderId, payload.taskId);
    const orderId = linkedTask?.orderId || '';
    const taskId = linkedTask?._id ? String(linkedTask._id) : payload.taskId || '';
    const photoUrls = Array.isArray(payload.photoUrls)
        ? payload.photoUrls.filter(Boolean)
        : payload.photoUrl
          ? [payload.photoUrl]
          : [];

    const externalTicket = await createOpsTicket(riderId, {
        ...payload,
        taskId,
        orderId,
        photoUrls,
    });

    const ticket = await SupportTicket.create({
        riderId,
        taskId,
        orderId,
        issueType: payload.issueType,
        description: payload.description,
        photoUrl: photoUrls[0] || '',
        photoUrls,
        location: payload.location || null,
        externalTicketId: externalTicket?.id || externalTicket?._id?.toString?.() || '',
    });

    // Optionally notify admins
    if (config.NOTIFICATION_SERVICE_URL && config.INTERNAL_SERVICE_TOKEN) {
        await fetch(`${config.NOTIFICATION_SERVICE_URL}/api/notifications/internal`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-token': config.INTERNAL_SERVICE_TOKEN,
            },
            body: JSON.stringify({
                type: 'support_incident',
                title: `New Incident from Delivery Partner: ${payload.issueType}`,
                message: payload.description,
                metadata: {
                    riderId,
                    ticketId: String(ticket._id),
                    externalTicketId: ticket.externalTicketId || '',
                    taskId,
                    orderId,
                },
            }),
        }).catch(() => null);
    }

    return {
        ...ticket.toObject(),
        linkedTask: linkedTask ? sanitizeTask(linkedTask) : null,
        reviewTicketId: ticket.externalTicketId || '',
    };
};

const trackByOrderId = async (orderId) => {
    const task = await DeliveryTask.findOne({ orderId }).lean();
    return task ? sanitizeTask(task) : null;
};

const sendOtp = async (phone) => {
    const { twilioService } = require('./twilio.service'); // Delay require if needed or define at top
    const twilio = require('./twilio.service');
    return twilio.sendOtp(phone);
};

const verifyOtp = async (phone, otp) => {
    const twilio = require('./twilio.service');
    const isValid = await twilio.verifyOtp(phone, otp);
    if (!isValid) throw new Error('Invalid OTP');

    let profile = await DeliveryPartnerProfile.findOne({ phone });
    if (!profile) {
        // Create a new partner if one doesn't exist
        const newUserId = 'dp_' + Math.random().toString(36).substr(2, 9);
        profile = await DeliveryPartnerProfile.create({ phone, userId: newUserId });
    }
    return profile;
};

const getProfile = async (riderId) => {
    const profile = await DeliveryPartnerProfile.findOne({ userId: riderId }).lean();
    if (!profile) throw new Error('Profile not found');
    return profile;
};

const updateProfile = async (riderId, data) => {
    const profile = await DeliveryPartnerProfile.findOneAndUpdate(
        { userId: riderId },
        { $set: data },
        { new: true }
    );
    if (!profile) throw new Error('Profile not found');
    return profile;
};

module.exports = {
    createDeliveryTaskInternal,
    listAvailableTasks,
    acceptTask,
    rejectTask,
    getTaskById,
    getCurrentTaskForRider,
    listRiderTasks,
    markArrivedPickup,
    confirmPickup,
    updateLiveLocation,
    markDelivered,
    submitDeliveryProof,
    markDeliveryFailure,
    getAvailability,
    updateAvailability,
    submitIdentityVerification,
    getEarningsSummary,
    raiseSos,
    trackByOrderId,
    sendOtp,
    verifyOtp,
    getProfile,
    updateProfile,
    raiseSupportIncident,
};
