const couponService = require('../services/coupon.service');
const { sendSuccess, sendError } = require('../../../../shared/utils/response');

const applyCoupon = async (req, res, next) => {
    try {
        const { code, subtotal, flowType } = req.body;
        if (!code || !subtotal) return sendError(res, 'code and subtotal are required', 400);
        const data = await couponService.applyCoupon(req.headers['x-user-id'], {
            code,
            subtotal,
            flowType,
        });
        return sendSuccess(res, data, 'Coupon applied');
    } catch (err) {
        next(err);
    }
};

module.exports = { applyCoupon };
