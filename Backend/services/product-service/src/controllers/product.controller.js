const productService = require('../services/product.service');
const slugify = require('../../../../shared/utils/slugify');
const { sendSuccess, sendCreated } = require('../../../../shared/utils/response');
const Category = require('../models/category.model');

// Auto-resolve or create a default category for business printing products
const resolveBusinessPrintingCategory = async () => {
    let cat = await Category.findOne({ flowType: 'printing', slug: 'business-printing' });
    if (!cat) {
        cat = await Category.create({
            name: 'Business Printing',
            slug: 'business-printing',
            flowType: 'printing',
            isActive: true,
        });
    }
    return cat._id;
};

const getProducts = async (req, res, next) => {
    try {
        const data = await productService.getProducts(req.query);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const getProductById = async (req, res, next) => {
    try {
        const data = await productService.getProductById(req.params.id);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const getProductBySlug = async (req, res, next) => {
    try {
        const data = await productService.getProductBySlug(req.params.slug);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const createProduct = async (req, res, next) => {
    try {
        if (!req.body.slug) req.body.slug = slugify(req.body.name);
        if (!req.body.category && req.body.businessPrintType) {
            req.body.category = await resolveBusinessPrintingCategory();
        }
        const data = await productService.createProduct(req.body);
        return sendCreated(res, data);
    } catch (err) {
        next(err);
    }
};

const updateProduct = async (req, res, next) => {
    try {
        const data = await productService.updateProduct(req.params.id, req.body);
        return sendSuccess(res, data, 'Product updated');
    } catch (err) {
        next(err);
    }
};

const deleteProduct = async (req, res, next) => {
    try {
        await productService.deleteProduct(req.params.id);
        return sendSuccess(res, null, 'Product deleted');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getProducts,
    getProductById,
    getProductBySlug,
    createProduct,
    updateProduct,
    deleteProduct,
};
