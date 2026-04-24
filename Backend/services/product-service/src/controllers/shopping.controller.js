const slugify = require('../../../../shared/utils/slugify');
const { sendSuccess, sendCreated } = require('../../../../shared/utils/response');
const shoppingService = require('../services/shopping.service');

const getHome = async (req, res, next) => {
    try {
        return sendSuccess(res, await shoppingService.getHome());
    } catch (error) {
        next(error);
    }
};

const getCategories = async (req, res, next) => {
    try {
        return sendSuccess(res, await shoppingService.getCategories());
    } catch (error) {
        next(error);
    }
};

const listProducts = async (req, res, next) => {
    try {
        return sendSuccess(res, await shoppingService.listProducts(req.query));
    } catch (error) {
        next(error);
    }
};

const getProductBySlug = async (req, res, next) => {
    try {
        return sendSuccess(res, await shoppingService.getProductBySlug(req.params.slug));
    } catch (error) {
        next(error);
    }
};

const getDeals = async (req, res, next) => {
    try {
        return sendSuccess(res, await shoppingService.getDealProduct());
    } catch (error) {
        next(error);
    }
};

const getTrending = async (req, res, next) => {
    try {
        return sendSuccess(res, await shoppingService.getTrendingProducts());
    } catch (error) {
        next(error);
    }
};

const searchProducts = async (req, res, next) => {
    try {
        return sendSuccess(res, await shoppingService.searchProducts(req.query));
    } catch (error) {
        next(error);
    }
};

const createProduct = async (req, res, next) => {
    try {
        if (!req.body.slug) req.body.slug = slugify(req.body.name);
        return sendCreated(
            res,
            await shoppingService.createProduct(req.body, req.headers['x-user-id']),
            'Product created'
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
            await shoppingService.updateProduct(
                req.params.id,
                req.body,
                req.headers['x-user-id']
            ),
            'Product updated'
        );
    } catch (error) {
        next(error);
    }
};

const deleteProduct = async (req, res, next) => {
    try {
        return sendSuccess(res, await shoppingService.deleteProduct(req.params.id), 'Product deleted');
    } catch (error) {
        next(error);
    }
};

const patchDeal = async (req, res, next) => {
    try {
        return sendSuccess(
            res,
            await shoppingService.patchDeal(req.params.id, req.body),
            'Deal updated'
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
            await shoppingService.createCategory(req.body),
            'Category created'
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
            await shoppingService.updateCategory(req.params.id, req.body),
            'Category updated'
        );
    } catch (error) {
        next(error);
    }
};

const createBanner = async (req, res, next) => {
    try {
        return sendCreated(
            res,
            await shoppingService.createBanner(req.body, req.headers['x-user-id']),
            'Banner created'
        );
    } catch (error) {
        next(error);
    }
};

const updateBanner = async (req, res, next) => {
    try {
        return sendSuccess(
            res,
            await shoppingService.updateBanner(req.params.id, req.body),
            'Banner updated'
        );
    } catch (error) {
        next(error);
    }
};

const deleteBanner = async (req, res, next) => {
    try {
        return sendSuccess(res, await shoppingService.deleteBanner(req.params.id), 'Banner deleted');
    } catch (error) {
        next(error);
    }
};

const resolveItems = async (req, res, next) => {
    try {
        return sendSuccess(res, await shoppingService.resolveCartItems(req.body));
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getHome,
    getCategories,
    listProducts,
    getProductBySlug,
    getDeals,
    getTrending,
    searchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    patchDeal,
    createCategory,
    updateCategory,
    createBanner,
    updateBanner,
    deleteBanner,
    resolveItems,
};
