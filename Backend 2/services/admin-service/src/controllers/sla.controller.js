const mongoose = require('mongoose');
const SlaPolicy = require('../models/sla-policy.model');
const SlaBreach = require('../models/sla-breach.model');
const AuditLog = require('../models/audit-log.model');
const { sendSuccess, sendCreated, sendError } = require('../../../../shared/utils/response');
const { paginate, paginateMeta } = require('../../../../shared/utils/pagination');
const config = require('../config');

// ─── Helpers ──────────────────────────────────────────────

const getOrderConn = async () => {
    const existing = mongoose.connections.find(
        (c) => c.name === 'speedcopy_orders' && c.readyState === 1
    );
    if (existing) return existing;
    return mongoose
        .createConnection(config.getDbUri('order'), { family: 4, serverSelectionTimeoutMS: 5000 })
        .asPromise();
};

/**
 * Map order status to the timestamp field that marks when it entered that status.
 */
const STATUS_TIMESTAMP_MAP = {
    pending: 'createdAt',
    confirmed: 'updatedAt',
    assigned_vendor: 'assignedAt',
    vendor_accepted: 'acceptedAt',
    in_production: 'productionStartedAt',
    qc_pending: 'qcAt',
    ready_for_pickup: 'readyAt',
    delivery_assigned: 'updatedAt',
    out_for_delivery: 'updatedAt',
    delivered: 'deliveredAt',
};

// ─── GET /api/admin/sla/risks ─────────────────────────────

const getRisks = async (req, res, next) => {
    try {
        const policies = await SlaPolicy.find({ isActive: true });
        if (!policies.length) {
            return sendSuccess(res, { atRisk: [], totalRisks: 0 });
        }

        const conn = await getOrderConn();
        const activeStatuses = [
            'pending', 'confirmed', 'assigned_vendor', 'vendor_accepted',
            'in_production', 'qc_pending', 'ready_for_pickup',
            'delivery_assigned', 'out_for_delivery',
        ];

        const orders = await conn.db
            .collection('orders')
            .find({ status: { $in: activeStatuses } })
            .sort({ createdAt: 1 })
            .limit(500)
            .toArray();

        const now = Date.now();
        const atRisk = [];

        for (const order of orders) {
            const matchingPolicies = policies.filter(
                (p) =>
                    (p.flowType === 'all' || p.flowType === order.items?.[0]?.flowType) &&
                    p.fromStatus === order.status
            );

            for (const policy of matchingPolicies) {
                const enteredAt = order[STATUS_TIMESTAMP_MAP[order.status]] || order.updatedAt || order.createdAt;
                const elapsed = Math.round((now - new Date(enteredAt).getTime()) / 60000);

                if (elapsed >= policy.warningMinutes) {
                    atRisk.push({
                        orderId: String(order._id),
                        orderNumber: order.orderNumber,
                        status: order.status,
                        flowType: order.items?.[0]?.flowType || 'unknown',
                        policyName: policy.name,
                        elapsedMinutes: elapsed,
                        maxMinutes: policy.maxMinutes,
                        warningMinutes: policy.warningMinutes,
                        severity: elapsed >= policy.maxMinutes ? 'breach' : 'warning',
                        escalationLevel: policy.escalationLevel,
                    });
                }
            }
        }

        atRisk.sort((a, b) => b.elapsedMinutes - a.elapsedMinutes);

        return sendSuccess(res, { atRisk, totalRisks: atRisk.length });
    } catch (err) {
        next(err);
    }
};

// ─── GET /api/admin/sla/policies ──────────────────────────

const getPolicies = async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.flowType) filter.flowType = req.query.flowType;
        if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

        const policies = await SlaPolicy.find(filter).sort({ flowType: 1, fromStatus: 1 });
        return sendSuccess(res, { policies });
    } catch (err) {
        next(err);
    }
};

// ─── POST /api/admin/sla/policies ─────────────────────────

const createPolicy = async (req, res, next) => {
    try {
        const {
            name, description, flowType, fromStatus, toStatus,
            maxMinutes, warningMinutes, escalationLevel,
            compensationType, compensationValue,
        } = req.body;

        if (!name || !flowType || !fromStatus || !toStatus || !maxMinutes || !warningMinutes) {
            return sendError(res, 'name, flowType, fromStatus, toStatus, maxMinutes, and warningMinutes are required', 400);
        }

        if (warningMinutes >= maxMinutes) {
            return sendError(res, 'warningMinutes must be less than maxMinutes', 400);
        }

        const policy = await SlaPolicy.create({
            name, description, flowType, fromStatus, toStatus,
            maxMinutes, warningMinutes,
            escalationLevel: escalationLevel || 'medium',
            compensationType: compensationType || 'none',
            compensationValue: compensationValue || 0,
        });

        await AuditLog.create({
            actorId: req.headers['x-user-id'] || '',
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.sla.policy_created',
            targetType: 'sla_policy',
            targetId: String(policy._id),
            metadata: { name, flowType, maxMinutes },
        });

        return sendCreated(res, policy, 'SLA policy created');
    } catch (err) {
        next(err);
    }
};

// ─── GET /api/admin/sla/metrics ───────────────────────────

const getMetrics = async (req, res, next) => {
    try {
        const { from, to } = req.query;
        const dateFilter = {};
        if (from) dateFilter.$gte = new Date(from);
        if (to) dateFilter.$lte = new Date(to);

        const matchStage = {};
        if (Object.keys(dateFilter).length) matchStage.createdAt = dateFilter;

        const [totalBreaches, severityCounts, flowCounts, avgElapsed] = await Promise.all([
            SlaBreach.countDocuments(matchStage),
            SlaBreach.aggregate([
                { $match: matchStage },
                { $group: { _id: '$severity', count: { $sum: 1 } } },
            ]),
            SlaBreach.aggregate([
                { $match: matchStage },
                { $group: { _id: '$flowType', count: { $sum: 1 } } },
            ]),
            SlaBreach.aggregate([
                { $match: matchStage },
                { $group: { _id: null, avg: { $avg: '$elapsedMinutes' } } },
            ]),
        ]);

        const escalated = await SlaBreach.countDocuments({ ...matchStage, isEscalated: true });
        const compensated = await SlaBreach.countDocuments({ ...matchStage, isCompensated: true });

        return sendSuccess(res, {
            totalBreaches,
            escalatedCount: escalated,
            compensatedCount: compensated,
            avgElapsedMinutes: Math.round(avgElapsed[0]?.avg || 0),
            bySeverity: severityCounts.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
            byFlow: flowCounts.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
        });
    } catch (err) {
        next(err);
    }
};

// ─── GET /api/admin/sla/breaches ──────────────────────────

const getBreaches = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const filter = {};
        if (req.query.severity) filter.severity = req.query.severity;
        if (req.query.flowType) filter.flowType = req.query.flowType;
        if (req.query.isEscalated !== undefined) filter.isEscalated = req.query.isEscalated === 'true';

        const [breaches, total] = await Promise.all([
            SlaBreach.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            SlaBreach.countDocuments(filter),
        ]);

        return sendSuccess(res, { breaches, meta: paginateMeta(total, page, limit) });
    } catch (err) {
        next(err);
    }
};

// ─── POST /api/admin/sla/:orderId/escalate ────────────────

const escalateOrder = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const { note, policyId } = req.body;
        const actorId = req.headers['x-user-id'] || '';

        const conn = await getOrderConn();
        const order = await conn.db
            .collection('orders')
            .findOne({ _id: new mongoose.Types.ObjectId(orderId) });

        if (!order) return sendError(res, 'Order not found', 404);

        // Find or create breach record
        let breach = await SlaBreach.findOne({ orderId, isEscalated: false });

        if (!breach) {
            const policy = policyId
                ? await SlaPolicy.findById(policyId)
                : await SlaPolicy.findOne({ fromStatus: order.status, isActive: true });

            const enteredAt = order[STATUS_TIMESTAMP_MAP[order.status]] || order.updatedAt || order.createdAt;
            const elapsed = Math.round((Date.now() - new Date(enteredAt).getTime()) / 60000);

            breach = await SlaBreach.create({
                orderId,
                policyId: policy?._id || new mongoose.Types.ObjectId(),
                policyName: policy?.name || 'Manual Escalation',
                flowType: order.items?.[0]?.flowType || 'unknown',
                fromStatus: order.status,
                toStatus: policy?.toStatus || '',
                elapsedMinutes: elapsed,
                maxMinutes: policy?.maxMinutes || 0,
                severity: 'critical',
                isEscalated: true,
                escalatedAt: new Date(),
                escalatedBy: actorId,
                escalationNote: note || '',
            });
        } else {
            breach.isEscalated = true;
            breach.escalatedAt = new Date();
            breach.escalatedBy = actorId;
            breach.escalationNote = note || '';
            breach.severity = 'critical';
            await breach.save();
        }

        // Update order timeline
        await conn.db.collection('orders').updateOne(
            { _id: new mongoose.Types.ObjectId(orderId) },
            {
                $push: {
                    timeline: {
                        status: order.status,
                        note: `SLA escalated: ${note || 'Order escalated by admin'}`,
                        timestamp: new Date(),
                    },
                },
            }
        );

        await AuditLog.create({
            actorId,
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.sla.escalate',
            targetType: 'order',
            targetId: orderId,
            reason: note || 'SLA escalation',
            metadata: { breachId: String(breach._id) },
        });

        return sendSuccess(res, breach, 'Order escalated');
    } catch (err) {
        next(err);
    }
};

// ─── POST /api/admin/sla/:orderId/compensate ──────────────

const compensateOrder = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const { compensationType, compensationValue, note } = req.body;
        const actorId = req.headers['x-user-id'] || '';

        if (!compensationType || !compensationValue) {
            return sendError(res, 'compensationType and compensationValue are required', 400);
        }

        let breach = await SlaBreach.findOne({ orderId });
        if (!breach) {
            return sendError(res, 'No SLA breach record found for this order', 404);
        }

        breach.isCompensated = true;
        breach.compensationType = compensationType;
        breach.compensationValue = compensationValue;
        breach.compensatedAt = new Date();
        breach.compensatedBy = actorId;
        await breach.save();

        await AuditLog.create({
            actorId,
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.sla.compensate',
            targetType: 'order',
            targetId: orderId,
            reason: note || `Compensation: ${compensationType} ₹${compensationValue}`,
            metadata: { compensationType, compensationValue, breachId: String(breach._id) },
        });

        return sendSuccess(res, breach, 'Compensation recorded');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getRisks,
    getPolicies,
    createPolicy,
    getMetrics,
    getBreaches,
    escalateOrder,
    compensateOrder,
};
