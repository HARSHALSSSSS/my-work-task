const payoutService = require('../services/payout.service');
const { sendSuccess, sendCreated } = require('../../../../shared/utils/response');

const emitRefundNotification = async ({ customerId, orderId, amount, reason }) => {
    const baseUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4007';
    const internalToken = process.env.INTERNAL_SERVICE_TOKEN || 'speedcopy-internal-dev-token';
    if (!customerId) return;
    await fetch(`${baseUrl}/api/notifications/internal`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-internal-token': internalToken,
        },
        body: JSON.stringify({
            userId: customerId,
            type: 'in_app',
            title: 'Refund initiated',
            message: reason || `A refund of INR ${amount} has been processed to your wallet.`,
            category: 'rewards',
            metadata: { orderId, amount },
            status: 'sent',
        }),
    }).catch(() => null);
};

const getVendorSummary = async (req, res, next) => {
    try {
        const data = await payoutService.getVendorSummary(req.headers['x-user-id']);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const getPayoutHistory = async (req, res, next) => {
    try {
        const data = await payoutService.getPayoutHistory(req.headers['x-user-id'], req.query);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const getAdminSummary = async (req, res, next) => {
    try {
        const data = await payoutService.getAdminFinanceSummary();
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const createRefund = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const { amount, reason } = req.body;
        const walletService = require('../services/wallet.service');
        // Credit refund to customer wallet
        const data = await walletService.transact(req.body.customerId || req.headers['x-user-id'], {
            type: 'credit',
            category: 'refund',
            amount,
            referenceId: orderId,
            referenceType: 'order',
            description: reason || 'Order refund',
        });
        await emitRefundNotification({
            customerId: req.body.customerId || req.headers['x-user-id'],
            orderId,
            amount,
            reason,
        });
        return sendCreated(res, data, 'Refund processed');
    } catch (err) {
        next(err);
    }
};

module.exports = { getVendorSummary, getPayoutHistory, getAdminSummary, createRefund };
