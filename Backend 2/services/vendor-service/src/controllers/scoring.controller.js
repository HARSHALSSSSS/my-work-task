const mongoose = require('mongoose');
const { sendSuccess, sendError } = require('../../../../shared/utils/response');
const config = require('../config');

const getOrderConn = async () => {
    const existing = mongoose.connections.find(
        (c) => c.name === 'speedcopy_orders' && c.readyState === 1
    );
    if (existing) return existing;
    if (!config.orderDbUri) {
        throw new Error('ORDER_DB_URI is not set');
    }

    return mongoose
        .createConnection(config.orderDbUri, { family: 4, serverSelectionTimeoutMS: 5000 })
        .asPromise();
};

const getVendorId = (req) => req.headers['x-user-id'];

const getRejectionsHistory = async (req, res, next) => {
    try {
        const conn = await getOrderConn();
        const data = await conn.db.collection('orders').find({
            vendorId: getVendorId(req),
            status: 'cancelled',
            'timeline.note': { $regex: /rejected by vendor/i }
        }).toArray();
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const getPerformanceScore = async (req, res, next) => {
    try {
        const conn = await getOrderConn();
        const vendorId = getVendorId(req);

        const [total, delivered, rejected] = await Promise.all([
            conn.db.collection('orders').countDocuments({ vendorId }),
            conn.db.collection('orders').countDocuments({ vendorId, status: 'delivered' }),
            conn.db.collection('orders').countDocuments({ vendorId, status: 'cancelled', 'timeline.note': { $regex: /rejected by vendor/i } })
        ]);

        const acceptanceRate = total > 0 ? ((total - rejected) / total) * 100 : 100;
        const completionRate = total > 0 ? (delivered / total) * 100 : 100;

        return sendSuccess(res, {
            acceptanceRate: Math.round(acceptanceRate),
            completionRate: Math.round(completionRate),
            overallScore: Math.round((acceptanceRate + completionRate) / 2)
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getRejectionsHistory,
    getPerformanceScore
};
