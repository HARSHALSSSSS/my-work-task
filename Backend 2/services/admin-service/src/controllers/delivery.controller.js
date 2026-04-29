const mongoose = require('mongoose');
const AuditLog = require('../models/audit-log.model');
const { sendSuccess, sendCreated, sendError } = require('../../../../shared/utils/response');
const { paginate, paginateMeta } = require('../../../../shared/utils/pagination');
const config = require('../config');

// ─── Cross-DB Connections ─────────────────────────────────

const getDeliveryConn = async () => {
    const existing = mongoose.connections.find(
        (c) => c.name === 'speedcopy_delivery' && c.readyState === 1
    );
    if (existing) return existing;
    return mongoose
        .createConnection(config.getDbUri('delivery'), { family: 4, serverSelectionTimeoutMS: 5000 })
        .asPromise();
};

const getAuthConn = async () => {
    const existing = mongoose.connections.find(
        (c) => c.name === 'speedcopy_auth' && c.readyState === 1
    );
    if (existing) return existing;
    return mongoose
        .createConnection(config.getDbUri('auth'), { family: 4, serverSelectionTimeoutMS: 5000 })
        .asPromise();
};

// ─── GET /api/admin/delivery/partners ─────────────────────

const getPartners = async (req, res, next) => {
    try {
        const authConn = await getAuthConn();
        const deliveryConn = await getDeliveryConn();
        const { page, limit, skip } = paginate(req.query);

        const userFilter = { role: 'delivery_partner' };
        if (req.query.isActive !== undefined) userFilter.isActive = req.query.isActive === 'true';
        if (req.query.search) {
            const pattern = new RegExp(req.query.search, 'i');
            userFilter.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
        }

        const [users, total] = await Promise.all([
            authConn.db
                .collection('users')
                .find(userFilter)
                .project({ password: 0 })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            authConn.db.collection('users').countDocuments(userFilter),
        ]);

        // Enrich with delivery profiles
        const userIds = users.map((u) => String(u._id));
        const profiles = await deliveryConn.db
            .collection('deliverypartnerprofiles')
            .find({ userId: { $in: userIds } })
            .toArray();

        const profileMap = new Map(profiles.map((p) => [p.userId, p]));

        const partners = users.map((u) => ({
            ...u,
            deliveryProfile: profileMap.get(String(u._id)) || null,
        }));

        return sendSuccess(res, { partners, meta: paginateMeta(total, page, limit) });
    } catch (err) {
        next(err);
    }
};

// ─── POST /api/admin/delivery/partners ────────────────────

const createPartner = async (req, res, next) => {
    try {
        const { name, email, phone, vehicleType, zoneAssignments } = req.body;
        if (!name || !email) return sendError(res, 'name and email are required', 400);

        const authConn = await getAuthConn();
        const deliveryConn = await getDeliveryConn();

        // Check if user exists
        const existing = await authConn.db.collection('users').findOne({ email: email.toLowerCase() });
        if (existing) return sendError(res, 'A user with this email already exists', 409);

        // Create user in auth DB
        const userDoc = {
            name,
            email: email.toLowerCase(),
            phone: phone || '',
            role: 'delivery_partner',
            isActive: true,
            isEmailVerified: false,
            deliveryDetails: {
                vehicleType: vehicleType || '',
                isAvailable: false,
                isApproved: false,
                kycStatus: 'pending',
                zoneAssignments: zoneAssignments || [],
            },
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const insertResult = await authConn.db.collection('users').insertOne(userDoc);
        const userId = String(insertResult.insertedId);

        // Create profile in delivery DB
        await deliveryConn.db.collection('deliverypartnerprofiles').insertOne({
            userId,
            isAvailable: false,
            kycStatus: 'pending',
            zoneAssignments: zoneAssignments || [],
            vehicleType: vehicleType || '',
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        await AuditLog.create({
            actorId: req.headers['x-user-id'] || '',
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.delivery.partner_created',
            targetType: 'delivery_partner',
            targetId: userId,
            metadata: { name, email },
        });

        return sendCreated(res, { ...userDoc, _id: insertResult.insertedId }, 'Delivery partner created');
    } catch (err) {
        next(err);
    }
};

// ─── GET /api/admin/delivery/partners/:partnerId ──────────

const getPartner = async (req, res, next) => {
    try {
        const authConn = await getAuthConn();
        const deliveryConn = await getDeliveryConn();
        const { partnerId } = req.params;

        const user = await authConn.db
            .collection('users')
            .findOne(
                { _id: new mongoose.Types.ObjectId(partnerId) },
                { projection: { password: 0 } }
            );

        if (!user) return sendError(res, 'Delivery partner not found', 404);

        const profile = await deliveryConn.db
            .collection('deliverypartnerprofiles')
            .findOne({ userId: partnerId });

        const recentTasks = await deliveryConn.db
            .collection('deliverytasks')
            .find({ riderId: partnerId })
            .sort({ createdAt: -1 })
            .limit(10)
            .toArray();

        return sendSuccess(res, {
            ...user,
            deliveryProfile: profile || null,
            recentTasks,
        });
    } catch (err) {
        next(err);
    }
};

// ─── PUT /api/admin/delivery/partners/:partnerId ──────────

const updatePartner = async (req, res, next) => {
    try {
        const { partnerId } = req.params;
        const { name, phone, vehicleType, isActive } = req.body;
        const authConn = await getAuthConn();
        const deliveryConn = await getDeliveryConn();

        const updateFields = { updatedAt: new Date() };
        if (name !== undefined) updateFields.name = name;
        if (phone !== undefined) updateFields.phone = phone;
        if (isActive !== undefined) updateFields.isActive = isActive;
        if (vehicleType !== undefined) {
            updateFields['deliveryDetails.vehicleType'] = vehicleType;
        }

        await authConn.db
            .collection('users')
            .updateOne(
                { _id: new mongoose.Types.ObjectId(partnerId) },
                { $set: updateFields }
            );

        if (vehicleType !== undefined) {
            await deliveryConn.db
                .collection('deliverypartnerprofiles')
                .updateOne(
                    { userId: partnerId },
                    { $set: { vehicleType, updatedAt: new Date() } }
                );
        }

        await AuditLog.create({
            actorId: req.headers['x-user-id'] || '',
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.delivery.partner_updated',
            targetType: 'delivery_partner',
            targetId: partnerId,
            metadata: updateFields,
        });

        return sendSuccess(res, null, 'Delivery partner updated');
    } catch (err) {
        next(err);
    }
};

// ─── DELETE /api/admin/delivery/partners/:partnerId ───────

const deletePartner = async (req, res, next) => {
    try {
        const { partnerId } = req.params;
        const authConn = await getAuthConn();

        // Soft-delete: deactivate the user
        await authConn.db
            .collection('users')
            .updateOne(
                { _id: new mongoose.Types.ObjectId(partnerId) },
                { $set: { isActive: false, deletedAt: new Date(), updatedAt: new Date() } }
            );

        await AuditLog.create({
            actorId: req.headers['x-user-id'] || '',
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.delivery.partner_deleted',
            targetType: 'delivery_partner',
            targetId: partnerId,
        });

        return sendSuccess(res, null, 'Delivery partner removed');
    } catch (err) {
        next(err);
    }
};

// ─── PATCH /api/admin/delivery/partners/:partnerId/suspend

const suspendPartner = async (req, res, next) => {
    try {
        const { partnerId } = req.params;
        const { reason } = req.body;
        const authConn = await getAuthConn();

        await authConn.db
            .collection('users')
            .updateOne(
                { _id: new mongoose.Types.ObjectId(partnerId) },
                {
                    $set: {
                        isBlocked: true,
                        blockedReason: reason || 'Suspended by admin',
                        'deliveryDetails.isAvailable': false,
                        updatedAt: new Date(),
                    },
                }
            );

        await AuditLog.create({
            actorId: req.headers['x-user-id'] || '',
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.delivery.partner_suspended',
            targetType: 'delivery_partner',
            targetId: partnerId,
            reason: reason || 'Suspended by admin',
        });

        return sendSuccess(res, null, 'Delivery partner suspended');
    } catch (err) {
        next(err);
    }
};

// ─── PATCH /api/admin/delivery/partners/:partnerId/resume ─

const resumePartner = async (req, res, next) => {
    try {
        const { partnerId } = req.params;
        const authConn = await getAuthConn();

        await authConn.db
            .collection('users')
            .updateOne(
                { _id: new mongoose.Types.ObjectId(partnerId) },
                {
                    $set: {
                        isBlocked: false,
                        blockedReason: '',
                        updatedAt: new Date(),
                    },
                }
            );

        await AuditLog.create({
            actorId: req.headers['x-user-id'] || '',
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.delivery.partner_resumed',
            targetType: 'delivery_partner',
            targetId: partnerId,
        });

        return sendSuccess(res, null, 'Delivery partner resumed');
    } catch (err) {
        next(err);
    }
};

// ─── POST /api/admin/delivery/partners/:partnerId/zones ───

const updateZones = async (req, res, next) => {
    try {
        const { partnerId } = req.params;
        const { zones } = req.body;

        if (!Array.isArray(zones)) return sendError(res, 'zones must be an array', 400);

        const authConn = await getAuthConn();
        const deliveryConn = await getDeliveryConn();

        await Promise.all([
            authConn.db
                .collection('users')
                .updateOne(
                    { _id: new mongoose.Types.ObjectId(partnerId) },
                    { $set: { 'deliveryDetails.zoneAssignments': zones, updatedAt: new Date() } }
                ),
            deliveryConn.db
                .collection('deliverypartnerprofiles')
                .updateOne(
                    { userId: partnerId },
                    { $set: { zoneAssignments: zones, updatedAt: new Date() } },
                    { upsert: true }
                ),
        ]);

        await AuditLog.create({
            actorId: req.headers['x-user-id'] || '',
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.delivery.zones_updated',
            targetType: 'delivery_partner',
            targetId: partnerId,
            metadata: { zones },
        });

        return sendSuccess(res, { zones }, 'Zone assignments updated');
    } catch (err) {
        next(err);
    }
};

// ─── PATCH /api/admin/delivery/partners/:partnerId/payout-rate

const updatePayoutRate = async (req, res, next) => {
    try {
        const { partnerId } = req.params;
        const { payoutRatePerKm, payoutRatePerOrder } = req.body;
        const deliveryConn = await getDeliveryConn();

        const update = { updatedAt: new Date() };
        if (payoutRatePerKm !== undefined) update.payoutRatePerKm = payoutRatePerKm;
        if (payoutRatePerOrder !== undefined) update.payoutRatePerOrder = payoutRatePerOrder;

        await deliveryConn.db
            .collection('deliverypartnerprofiles')
            .updateOne(
                { userId: partnerId },
                { $set: update },
                { upsert: true }
            );

        await AuditLog.create({
            actorId: req.headers['x-user-id'] || '',
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.delivery.payout_rate_updated',
            targetType: 'delivery_partner',
            targetId: partnerId,
            metadata: { payoutRatePerKm, payoutRatePerOrder },
        });

        return sendSuccess(res, null, 'Payout rate updated');
    } catch (err) {
        next(err);
    }
};

// ─── GET /api/admin/delivery/sla-metrics ──────────────────

const getSlaMetrics = async (req, res, next) => {
    try {
        const deliveryConn = await getDeliveryConn();

        const [statusCounts, avgTimes, totalTasks] = await Promise.all([
            deliveryConn.db
                .collection('deliverytasks')
                .aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
                .toArray(),
            deliveryConn.db
                .collection('deliverytasks')
                .aggregate([
                    { $match: { status: 'delivered' } },
                    {
                        $project: {
                            deliveryTimeMs: { $subtract: ['$updatedAt', '$createdAt'] },
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            avgMs: { $avg: '$deliveryTimeMs' },
                            minMs: { $min: '$deliveryTimeMs' },
                            maxMs: { $max: '$deliveryTimeMs' },
                            count: { $sum: 1 },
                        },
                    },
                ])
                .toArray(),
            deliveryConn.db.collection('deliverytasks').countDocuments(),
        ]);

        const delivered = statusCounts.find((s) => s._id === 'delivered')?.count || 0;
        const failed = statusCounts.find((s) => s._id === 'failed')?.count || 0;
        const successRate = totalTasks > 0 ? Math.round((delivered / totalTasks) * 100) : 0;
        const avgData = avgTimes[0] || {};
        const toMinutes = (ms) => Math.round((ms || 0) / 60000);

        return sendSuccess(res, {
            totalTasks,
            successRate,
            failedCount: failed,
            deliveredCount: delivered,
            byStatus: statusCounts.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
            avgDeliveryMinutes: toMinutes(avgData.avgMs),
            minDeliveryMinutes: toMinutes(avgData.minMs),
            maxDeliveryMinutes: toMinutes(avgData.maxMs),
        });
    } catch (err) {
        next(err);
    }
};

// ─── GET /api/admin/delivery/partners/:partnerId/analytics

const getPartnerAnalytics = async (req, res, next) => {
    try {
        const { partnerId } = req.params;
        const deliveryConn = await getDeliveryConn();

        const [statusCounts, taskTimes, recentTasks] = await Promise.all([
            deliveryConn.db
                .collection('deliverytasks')
                .aggregate([
                    { $match: { riderId: partnerId } },
                    { $group: { _id: '$status', count: { $sum: 1 } } },
                ])
                .toArray(),
            deliveryConn.db
                .collection('deliverytasks')
                .aggregate([
                    { $match: { riderId: partnerId, status: 'delivered' } },
                    {
                        $project: {
                            deliveryTimeMs: { $subtract: ['$updatedAt', '$createdAt'] },
                            distanceKm: 1,
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            avgTimeMs: { $avg: '$deliveryTimeMs' },
                            totalDistance: { $sum: '$distanceKm' },
                            count: { $sum: 1 },
                        },
                    },
                ])
                .toArray(),
            deliveryConn.db
                .collection('deliverytasks')
                .find({ riderId: partnerId })
                .sort({ updatedAt: -1 })
                .limit(15)
                .toArray(),
        ]);

        const totalTasks = statusCounts.reduce((sum, s) => sum + s.count, 0);
        const delivered = statusCounts.find((s) => s._id === 'delivered')?.count || 0;
        const failed = statusCounts.find((s) => s._id === 'failed')?.count || 0;
        const timeData = taskTimes[0] || {};

        return sendSuccess(res, {
            partnerId,
            totalTasks,
            deliveredCount: delivered,
            failedCount: failed,
            successRate: totalTasks > 0 ? Math.round((delivered / totalTasks) * 100) : 0,
            avgDeliveryMinutes: Math.round((timeData.avgTimeMs || 0) / 60000),
            totalDistanceKm: Math.round((timeData.totalDistance || 0) * 10) / 10,
            byStatus: statusCounts.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
            recentTasks,
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getPartners,
    createPartner,
    getPartner,
    updatePartner,
    deletePartner,
    suspendPartner,
    resumePartner,
    updateZones,
    updatePayoutRate,
    getSlaMetrics,
    getPartnerAnalytics,
};
