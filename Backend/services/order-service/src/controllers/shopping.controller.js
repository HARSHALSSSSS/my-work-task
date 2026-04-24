const { sendSuccess, sendCreated } = require('../../../../shared/utils/response');
const shoppingService = require('../services/shopping.service');

const getCart = async (req, res, next) => {
    try {
        return sendSuccess(res, await shoppingService.getCart(req.headers['x-user-id']));
    } catch (error) {
        next(error);
    }
};

const addToCart = async (req, res, next) => {
    try {
        return sendCreated(
            res,
            await shoppingService.addToCart(req.headers['x-user-id'], req.body),
            'Item added to cart'
        );
    } catch (error) {
        next(error);
    }
};

const removeCartItem = async (req, res, next) => {
    try {
        return sendSuccess(
            res,
            await shoppingService.removeCartItem(req.headers['x-user-id'], req.params.itemId),
            'Item removed from cart'
        );
    } catch (error) {
        next(error);
    }
};

const createOrder = async (req, res, next) => {
    try {
        return sendCreated(
            res,
            await shoppingService.createOrder(req.headers['x-user-id'], req.body),
            'Order placed successfully'
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
