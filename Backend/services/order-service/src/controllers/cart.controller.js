const cartService = require('../services/cart.service');
const { sendSuccess, sendCreated } = require('../../../../shared/utils/response');

const getCart = async (req, res, next) => {
    try {
        const data = await cartService.getCart(req.headers['x-user-id']);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const addToCart = async (req, res, next) => {
    try {
        const data = await cartService.addToCart(req.headers['x-user-id'], req.body);
        return sendCreated(res, data, 'Item added to cart');
    } catch (err) {
        next(err);
    }
};

const removeFromCart = async (req, res, next) => {
    try {
        const data = await cartService.removeFromCart(req.headers['x-user-id'], req.params.itemId);
        return sendSuccess(res, data, 'Item removed from cart');
    } catch (err) {
        next(err);
    }
};

const updateCartItem = async (req, res, next) => {
    try {
        const data = await cartService.updateCartItem(
            req.headers['x-user-id'],
            req.params.itemId,
            req.body.quantity
        );
        return sendSuccess(res, data, 'Cart updated');
    } catch (err) {
        next(err);
    }
};

const clearCart = async (req, res, next) => {
    try {
        await cartService.clearCart(req.headers['x-user-id']);
        return sendSuccess(res, null, 'Cart cleared');
    } catch (err) {
        next(err);
    }
};

module.exports = { getCart, addToCart, removeFromCart, updateCartItem, clearCart };
