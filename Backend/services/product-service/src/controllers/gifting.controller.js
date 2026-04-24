const slugify = require('../../../../shared/utils/slugify');
const { sendSuccess, sendCreated } = require('../../../../shared/utils/response');
const giftingService = require('../services/gifting.service');

const getHome = async (req, res, next) => {
    try {
        return sendSuccess(res, await giftingService.getHome());
    } catch (error) {
        next(error);
    }
};

const getCategories = async (req, res, next) => {
    try {
        return sendSuccess(res, await giftingService.getCategories());
    } catch (error) {
        next(error);
    }
};

const listProducts = async (req, res, next) => {
    try {
        return sendSuccess(res, await giftingService.listProducts(req.query));
    } catch (error) {
        next(error);
    }
};

const getProduct = async (req, res, next) => {
    try {
        return sendSuccess(res, await giftingService.getProduct(req.params.identifier));
    } catch (error) {
        next(error);
    }
};

const searchProducts = async (req, res, next) => {
    try {
        return sendSuccess(res, await giftingService.searchProducts(req.query));
    } catch (error) {
        next(error);
    }
};

const createProduct = async (req, res, next) => {
    try {
        if (!req.body.slug) req.body.slug = slugify(req.body.name);
        return sendCreated(
            res,
            await giftingService.createProduct(req.body, req.headers['x-user-id']),
            'Gifting product created'
        );
    } catch (error) {
        next(error);
    }
};

const updateProduct = async (req, res, next) => {
    try {
        if (req.body.name && !req.body.slug) req.body.slug = slugify(req.body.name);
        return sendSuccess(
            res,
            await giftingService.updateProduct(req.params.id, req.body, req.headers['x-user-id']),
            'Gifting product updated'
        );
    } catch (error) {
        next(error);
    }
};

const deleteProduct = async (req, res, next) => {
    try {
        return sendSuccess(
            res,
            await giftingService.deleteProduct(req.params.id),
            'Gifting product deleted'
        );
    } catch (error) {
        next(error);
    }
};

const createCategory = async (req, res, next) => {
    try {
        if (!req.body.slug) req.body.slug = slugify(req.body.name);
        return sendCreated(
            res,
            await giftingService.createCategory(req.body),
            'Gifting category created'
        );
    } catch (error) {
        next(error);
    }
};

const updateCategory = async (req, res, next) => {
    try {
        if (req.body.name && !req.body.slug) req.body.slug = slugify(req.body.name);
        return sendSuccess(
            res,
            await giftingService.updateCategory(req.params.id, req.body),
            'Gifting category updated'
        );
    } catch (error) {
        next(error);
    }
};

const resolveItems = async (req, res, next) => {
    try {
        return sendSuccess(res, await giftingService.resolveCartItems(req.body));
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getHome,
    getCategories,
    listProducts,
    getProduct,
    searchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    createCategory,
    updateCategory,
    resolveItems,
};
