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

const getWalletSummary = async (req, res, next) => {
    try {
        const conn = await getOrderConn();
        const orders = await conn.db.collection('orders').find({
            vendorId: getVendorId(req),
            status: 'delivered'
        }).toArray();

        const totalEarnings = orders.reduce((sum, o) => sum + (o.vendorPayout || 0), 0);
        
        return sendSuccess(res, {
            balance: totalEarnings,
            pendingSettlement: totalEarnings * 0.2,
            availableForWithdrawal: totalEarnings * 0.8
        });
    } catch (err) {
        next(err);
    }
};

const getWalletStoreWise = async (req, res, next) => {
    try {
        const conn = await getOrderConn();
        const data = await conn.db.collection('orders').aggregate([
            { $match: { vendorId: getVendorId(req), status: 'delivered' } },
            { $group: { _id: '$storeId', earnings: { $sum: '$vendorPayout' }, orderCount: { $sum: 1 } } }
        ]).toArray();

        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const getWalletDeductions = async (req, res, next) => {
    try {
        return sendSuccess(res, { deductions: [] });
    } catch (err) {
        next(err);
    }
};

const getClosureDaily = async (req, res, next) => {
    try {
        return sendSuccess(res, { period: 'daily', earnings: 0, count: 0 });
    } catch (err) {
        next(err);
    }
};

const getClosureWeekly = async (req, res, next) => {
    try {
        return sendSuccess(res, { period: 'weekly', earnings: 0, count: 0 });
    } catch (err) {
        next(err);
    }
};

const getClosureMonthly = async (req, res, next) => {
    try {
        return sendSuccess(res, { period: 'monthly', earnings: 0, count: 0 });
    } catch (err) {
        next(err);
    }
};

const getPayoutsSchedule = async (req, res, next) => {
    try {
        return sendSuccess(res, { nextPayoutDate: new Date(), estimatedAmount: 0 });
    } catch (err) {
        next(err);
    }
};

const getPayoutsHistory = async (req, res, next) => {
    try {
        return sendSuccess(res, { payouts: [] });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getWalletSummary,
    getWalletStoreWise,
    getWalletDeductions,
    getClosureDaily,
    getClosureWeekly,
    getClosureMonthly,
    getPayoutsSchedule,
    getPayoutsHistory
};
