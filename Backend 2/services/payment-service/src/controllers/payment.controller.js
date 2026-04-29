const razorpayService = require('../services/razorpay.service');
const { sendSuccess, sendCreated } = require('../../../../shared/utils/response');

const createPayment = async (req, res, next) => {
    try {
        const data = await razorpayService.createPayment(req.headers['x-user-id'], req.body);
        return sendCreated(res, data, 'Payment initiated');
    } catch (err) {
        next(err);
    }
};

const verifyPayment = async (req, res, next) => {
    try {
        const data = await razorpayService.verifyPayment(req.body);
        return sendSuccess(res, data, 'Payment verified successfully');
    } catch (err) {
        next(err);
    }
};

module.exports = { createPayment, verifyPayment };
