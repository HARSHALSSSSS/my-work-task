const mongoose = require('mongoose');
const AuditLog = require('../models/audit-log.model');
const { sendSuccess, sendError } = require('../../../../shared/utils/response');
const { paginate, paginateMeta } = require('../../../../shared/utils/pagination');
const buildAttachmentUrls = (req) =>
    (req.files || []).map(
        (file) => `${req.protocol}://${req.get('host')}/uploads/admin/attachments/${file.filename}`
    );

// ─── Cross-DB Connection ──────────────────────────────────

const getNotifConn = async () => {
    const uri = process.env.NOTIFICATION_DB_URI || 'mongodb://127.0.0.1:27017/speedcopy_notifications';
    const existing = mongoose.connections.find(
        (c) => c.name === 'speedcopy_notifications' && c.readyState === 1
    );
    if (existing) return existing;
    return mongoose
        .createConnection(uri, { family: 4, serverSelectionTimeoutMS: 5000 })
        .asPromise();
};

// ─── GET /api/admin/tickets ───────────────────────────────

const getTickets = async (req, res, next) => {
    try {
        const conn = await getNotifConn();
        const { page, limit, skip } = paginate(req.query);
        const filter = {};

        if (req.query.status) filter.status = req.query.status;
        if (req.query.priority) filter.priority = req.query.priority;
        if (req.query.category) filter.category = req.query.category;
        if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
        if (req.query.search) {
            const pattern = new RegExp(req.query.search, 'i');
            filter.$or = [
                { subject: pattern },
                { description: pattern },
                { orderId: pattern },
            ];
        }

        const [tickets, total] = await Promise.all([
            conn.db
                .collection('tickets')
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            conn.db.collection('tickets').countDocuments(filter),
        ]);

        return sendSuccess(res, { tickets, meta: paginateMeta(total, page, limit) });
    } catch (err) {
        next(err);
    }
};

// ─── GET /api/admin/tickets/:ticketId ─────────────────────

const getTicket = async (req, res, next) => {
    try {
        const conn = await getNotifConn();
        const ticket = await conn.db
            .collection('tickets')
            .findOne({ _id: new mongoose.Types.ObjectId(req.params.ticketId) });

        if (!ticket) return sendError(res, 'Ticket not found', 404);
        return sendSuccess(res, ticket);
    } catch (err) {
        next(err);
    }
};

// ─── PATCH /api/admin/tickets/:ticketId/assign ────────────

const assignTicket = async (req, res, next) => {
    try {
        const { assignedTo } = req.body;
        if (!assignedTo) return sendError(res, 'assignedTo (staff userId) is required', 400);

        const conn = await getNotifConn();
        const result = await conn.db.collection('tickets').findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(req.params.ticketId) },
            {
                $set: {
                    assignedTo,
                    status: 'in_progress',
                    updatedAt: new Date(),
                },
            },
            { returnDocument: 'after' }
        );

        if (!result) return sendError(res, 'Ticket not found', 404);

        await AuditLog.create({
            actorId: req.headers['x-user-id'] || '',
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.tickets.assign',
            targetType: 'ticket',
            targetId: req.params.ticketId,
            metadata: { assignedTo },
        });

        return sendSuccess(res, result, 'Ticket assigned');
    } catch (err) {
        next(err);
    }
};

// ─── PATCH /api/admin/tickets/:ticketId/escalate ──────────

const escalateTicket = async (req, res, next) => {
    try {
        const { message } = req.body;
        const conn = await getNotifConn();

        const result = await conn.db.collection('tickets').findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(req.params.ticketId) },
            {
                $set: {
                    priority: 'urgent',
                    status: 'in_progress',
                    updatedAt: new Date(),
                },
                $push: {
                    replies: {
                        authorId: req.headers['x-user-id'] || '',
                        authorRole: req.headers['x-user-role'] || 'admin',
                        message: message || 'Ticket escalated by admin',
                        attachments: [],
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                },
            },
            { returnDocument: 'after' }
        );

        if (!result) return sendError(res, 'Ticket not found', 404);

        await AuditLog.create({
            actorId: req.headers['x-user-id'] || '',
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.tickets.escalate',
            targetType: 'ticket',
            targetId: req.params.ticketId,
            reason: message || 'Escalated by admin',
        });

        return sendSuccess(res, result, 'Ticket escalated');
    } catch (err) {
        next(err);
    }
};

// ─── PATCH /api/admin/tickets/:ticketId/resolve ───────────

const resolveTicket = async (req, res, next) => {
    try {
        const { resolution } = req.body;
        const conn = await getNotifConn();

        const updateDoc = {
            $set: {
                status: 'resolved',
                resolvedAt: new Date(),
                updatedAt: new Date(),
            },
        };

        if (resolution) {
            updateDoc.$push = {
                replies: {
                    authorId: req.headers['x-user-id'] || '',
                    authorRole: req.headers['x-user-role'] || 'admin',
                    message: resolution,
                    attachments: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            };
        }

        const result = await conn.db.collection('tickets').findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(req.params.ticketId) },
            updateDoc,
            { returnDocument: 'after' }
        );

        if (!result) return sendError(res, 'Ticket not found', 404);

        await AuditLog.create({
            actorId: req.headers['x-user-id'] || '',
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.tickets.resolve',
            targetType: 'ticket',
            targetId: req.params.ticketId,
            reason: resolution || 'Resolved by admin',
        });

        return sendSuccess(res, result, 'Ticket resolved');
    } catch (err) {
        next(err);
    }
};

// ─── POST /api/admin/tickets/:ticketId/messages ───────────

const addMessage = async (req, res, next) => {
    try {
        const uploadedAttachments = buildAttachmentUrls(req);
        const { message, attachments } = req.body;
        if (!message) return sendError(res, 'message is required', 400);

        const conn = await getNotifConn();
        const result = await conn.db.collection('tickets').findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(req.params.ticketId) },
            {
                $set: {
                    status: 'in_progress',
                    updatedAt: new Date(),
                },
                $push: {
                    replies: {
                        authorId: req.headers['x-user-id'] || '',
                        authorRole: req.headers['x-user-role'] || 'admin',
                        message,
                        attachments: uploadedAttachments.length ? uploadedAttachments : attachments || [],
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                },
            },
            { returnDocument: 'after' }
        );

        if (!result) return sendError(res, 'Ticket not found', 404);
        return sendSuccess(res, result, 'Message added');
    } catch (err) {
        next(err);
    }
};

const uploadAttachments = async (req, res, next) => {
    try {
        return sendSuccess(res, { attachments: buildAttachmentUrls(req) }, 'Attachments uploaded');
    } catch (err) {
        next(err);
    }
};

// ─── GET /api/admin/tickets/stats ─────────────────────────

const getStats = async (req, res, next) => {
    try {
        const conn = await getNotifConn();

        const [statusCounts, categoryCounts, priorityCounts, avgResolution] = await Promise.all([
            conn.db
                .collection('tickets')
                .aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
                .toArray(),
            conn.db
                .collection('tickets')
                .aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }])
                .toArray(),
            conn.db
                .collection('tickets')
                .aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }])
                .toArray(),
            conn.db
                .collection('tickets')
                .aggregate([
                    { $match: { resolvedAt: { $ne: null } } },
                    {
                        $project: {
                            resolutionMs: { $subtract: ['$resolvedAt', '$createdAt'] },
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            avgMs: { $avg: '$resolutionMs' },
                            minMs: { $min: '$resolutionMs' },
                            maxMs: { $max: '$resolutionMs' },
                        },
                    },
                ])
                .toArray(),
        ]);

        const total = await conn.db.collection('tickets').countDocuments();
        const resolutionData = avgResolution[0] || {};
        const toHours = (ms) => Math.round((ms || 0) / 3600000 * 10) / 10;

        return sendSuccess(res, {
            total,
            byStatus: statusCounts.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
            byCategory: categoryCounts.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
            byPriority: priorityCounts.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
            resolution: {
                avgHours: toHours(resolutionData.avgMs),
                minHours: toHours(resolutionData.minMs),
                maxHours: toHours(resolutionData.maxMs),
            },
        });
    } catch (err) {
        next(err);
    }
};

// ─── GET /api/admin/tickets/agents/performance ────────────

const getAgentPerformance = async (req, res, next) => {
    try {
        const conn = await getNotifConn();

        const agentStats = await conn.db
            .collection('tickets')
            .aggregate([
                { $match: { assignedTo: { $ne: null, $ne: '' } } },
                {
                    $group: {
                        _id: '$assignedTo',
                        totalAssigned: { $sum: 1 },
                        resolved: {
                            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
                        },
                        closed: {
                            $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] },
                        },
                        open: {
                            $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] },
                        },
                        inProgress: {
                            $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] },
                        },
                    },
                },
                { $sort: { totalAssigned: -1 } },
            ])
            .toArray();

        // Calculate resolution rate for each agent
        const agents = agentStats.map((agent) => ({
            agentId: agent._id,
            totalAssigned: agent.totalAssigned,
            resolved: agent.resolved,
            closed: agent.closed,
            open: agent.open,
            inProgress: agent.inProgress,
            resolutionRate:
                agent.totalAssigned > 0
                    ? Math.round(((agent.resolved + agent.closed) / agent.totalAssigned) * 100)
                    : 0,
        }));

        return sendSuccess(res, { agents });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getTickets,
    getTicket,
    assignTicket,
    escalateTicket,
    resolveTicket,
    addMessage,
    uploadAttachments,
    getStats,
    getAgentPerformance,
};
