const mongoose = require('mongoose');
const { sendSuccess } = require('../../../../shared/utils/response');
const AuditLog = require('../models/audit-log.model');
const config = require('../config');

const resolveDbUri = (dbName) => {
    if (dbName === 'speedcopy_orders') {
        return config.getDbUri('order');
    }

    throw new Error(`No configured URI for ${dbName}`);
};

const getConn = async (dbName) => {
    const existing = mongoose.connections.find((c) => c.name === dbName && c.readyState === 1);
    if (existing) return existing;

    const uri = resolveDbUri(dbName);

    return mongoose
        .createConnection(uri, { family: 4, serverSelectionTimeoutMS: 5000 })
        .asPromise();
};

const getReports = async (req, res, next) => {
    try {
        const { from, to } = req.query;
        const dateFilter = {};
        if (from) {
            const fromDate = new Date(from);
            if (Number.isNaN(fromDate.getTime())) {
                return res.status(400).json({ success: false, message: 'Invalid from date' });
            }
            dateFilter.$gte = fromDate;
        }
        if (to) {
            const toDate = new Date(to);
            if (Number.isNaN(toDate.getTime())) {
                return res.status(400).json({ success: false, message: 'Invalid to date' });
            }
            dateFilter.$lte = toDate;
        }

        const orderConn = await getConn('speedcopy_orders');

        const matchStage = Object.keys(dateFilter).length
            ? { $match: { createdAt: dateFilter } }
            : { $match: {} };

        const [revenueByDay, ordersByStatus, ordersByFlow] = await Promise.all([
            orderConn.db
                .collection('orders')
                .aggregate([
                    matchStage,
                    { $match: { paymentStatus: 'paid' } },
                    {
                        $group: {
                            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                            revenue: { $sum: '$total' },
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { _id: 1 } },
                ])
                .toArray(),
            orderConn.db
                .collection('orders')
                .aggregate([matchStage, { $group: { _id: '$status', count: { $sum: 1 } } }])
                .toArray(),
            orderConn.db
                .collection('orders')
                .aggregate([
                    matchStage,
                    { $unwind: '$items' },
                    {
                        $group: {
                            _id: '$items.flowType',
                            count: { $sum: 1 },
                            revenue: { $sum: '$items.totalPrice' },
                        },
                    },
                ])
                .toArray(),
        ]);

        return sendSuccess(res, { revenueByDay, ordersByStatus, ordersByFlow });
    } catch (err) {
        next(err);
    }
};

const getAuditLogs = async (req, res, next) => {
    try {
        const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
        const filter = {};
        if (req.query.action) filter.action = req.query.action;
        if (req.query.actorId) filter.actorId = req.query.actorId;
        if (req.query.targetType) filter.targetType = req.query.targetType;

        const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit);
        return sendSuccess(res, { logs });
    } catch (err) {
        next(err);
    }
};

module.exports = { getReports, getAuditLogs };
