const Payout = require('../models/payout.model');
const { paginate, paginateMeta } = require('../../../../shared/utils/pagination');

const PLATFORM_FEE_PERCENT = 10; // 10% platform fee

const getVendorSummary = async (vendorId) => {
    const [pending, paid, totalPayouts] = await Promise.all([
        Payout.aggregate([
            { $match: { vendorId, status: 'pending' } },
            { $group: { _id: null, total: { $sum: '$netAmount' } } },
        ]),
        Payout.aggregate([
            { $match: { vendorId, status: 'paid' } },
            { $group: { _id: null, total: { $sum: '$netAmount' } } },
        ]),
        Payout.countDocuments({ vendorId }),
    ]);

    return {
        pendingPayout: pending[0]?.total || 0,
        totalPaid: paid[0]?.total || 0,
        totalPayouts,
        platformFeePercent: PLATFORM_FEE_PERCENT,
    };
};

const getPayoutHistory = async (vendorId, query) => {
    const { page, limit, skip } = paginate(query);
    const [payouts, total] = await Promise.all([
        Payout.find({ vendorId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Payout.countDocuments({ vendorId }),
    ]);
    return { payouts, meta: paginateMeta(total, page, limit) };
};

const createPayout = async (vendorId, { amount, orderIds, periodStart, periodEnd, notes }) => {
    const platformFee = Math.round(amount * PLATFORM_FEE_PERCENT) / 100;
    const netAmount = amount - platformFee;

    return Payout.create({
        vendorId,
        amount,
        platformFee,
        netAmount,
        orderIds: orderIds || [],
        periodStart,
        periodEnd,
        notes,
        status: 'pending',
    });
};

const getAdminFinanceSummary = async () => {
    const [totalRevenue, pendingPayouts, paidPayouts] = await Promise.all([
        Payout.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
        Payout.aggregate([
            { $match: { status: 'pending' } },
            { $group: { _id: null, total: { $sum: '$netAmount' } } },
        ]),
        Payout.aggregate([
            { $match: { status: 'paid' } },
            { $group: { _id: null, total: { $sum: '$netAmount' } } },
        ]),
    ]);

    return {
        totalGrossRevenue: totalRevenue[0]?.total || 0,
        pendingPayouts: pendingPayouts[0]?.total || 0,
        paidPayouts: paidPayouts[0]?.total || 0,
    };
};

module.exports = { getVendorSummary, getPayoutHistory, createPayout, getAdminFinanceSummary };
