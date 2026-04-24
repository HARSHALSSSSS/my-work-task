const referralService = require('../services/referral.service');
const { sendSuccess, sendCreated } = require('../../../../shared/utils/response');

const getReferrals = async (req, res, next) => {
    try {
        const referral = await referralService.getOrCreateReferral(req.headers['x-user-id']);
        const history = await referralService.getReferrals(req.headers['x-user-id'], req.query);
        return sendSuccess(res, { myCode: referral.referralCode, ...history });
    } catch (err) {
        next(err);
    }
};

const getReferralSummary = async (req, res, next) => {
    try {
        const data = await referralService.getReferralSummary(req.headers['x-user-id']);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const applyReferral = async (req, res, next) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ success: false, message: 'code is required' });
        const data = await referralService.applyReferral(req.headers['x-user-id'], code);
        return sendCreated(res, data, 'Referral applied');
    } catch (err) {
        next(err);
    }
};

module.exports = { getReferrals, getReferralSummary, applyReferral };
