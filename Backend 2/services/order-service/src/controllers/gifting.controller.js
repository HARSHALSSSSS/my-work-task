const { sendSuccess, sendCreated } = require('../../../../shared/utils/response');
const giftingService = require('../services/gifting.service');

const getCart = async (req, res, next) => {
    try {
        return sendSuccess(res, await giftingService.getCart(req.headers['x-user-id']));
    } catch (error) {
        next(error);
    }
};

const addToCart = async (req, res, next) => {
    try {
        return sendCreated(
            res,
            await giftingService.addToCart(req.headers['x-user-id'], req.body),
            'Item added to gifting cart'
        );
    } catch (error) {
        next(error);
    }
};

const removeCartItem = async (req, res, next) => {
    try {
        return sendSuccess(
            res,
            await giftingService.removeCartItem(req.headers['x-user-id'], req.params.itemId),
            'Item removed from gifting cart'
        );
    } catch (error) {
        next(error);
    }
};

const createOrder = async (req, res, next) => {
    try {
        return sendCreated(
            res,
            await giftingService.createOrder(req.headers['x-user-id'], req.body),
            'Gifting order placed successfully'
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCart,
    addToCart,
    removeCartItem,
    createOrder,
};
