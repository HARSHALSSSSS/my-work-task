const walletService = require('../services/wallet.service');
const { sendSuccess } = require('../../../../shared/utils/response');

const getWallet = async (req, res, next) => {
    try {
        const data = await walletService.getWallet(req.headers['x-user-id']);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const getWalletOverview = async (req, res, next) => {
    try {
        const data = await walletService.getWalletOverview(req.headers['x-user-id']);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const getLedger = async (req, res, next) => {
    try {
        const data = await walletService.getLedger(req.headers['x-user-id'], req.query);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const getTopupConfig = async (req, res, next) => {
    try {
        const data = await walletService.getTopupConfig();
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const previewTopup = async (req, res, next) => {
    try {
        const data = await walletService.previewTopup(req.body.amount);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const getDeliveryEarningsSummary = async (req, res, next) => {
    try {
        const data = await walletService.getDeliveryEarningsSummary(req.headers['x-user-id']);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const addFunds = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'];
        const { amount, paymentMethod } = req.body;
        const data = await walletService.addFunds(userId, amount, paymentMethod);
        return sendSuccess(res, data, 201);
    } catch (err) {
        next(err);
    }
};

const initiateRazorpayPayment = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User ID not found' });
        }
        const body = req.body || {};
        const data = await walletService.initiateRazorpayPayment(userId, body);
        return res.status(201).json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

const verifyRazorpayPayment = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User ID not found' });
        }
        const body = req.body || {};
        const data = await walletService.verifyRazorpayPayment(userId, body);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getWallet,
    getWalletOverview,
    getTopupConfig,
    previewTopup,
    getLedger,
    getDeliveryEarningsSummary,
    addFunds,
    initiateRazorpayPayment,
    verifyRazorpayPayment,
};
