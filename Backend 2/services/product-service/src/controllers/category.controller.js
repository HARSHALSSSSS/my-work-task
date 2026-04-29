const categoryService = require('../services/category.service');
const slugify = require('../../../../shared/utils/slugify');
const { sendSuccess, sendCreated } = require('../../../../shared/utils/response');

// GET /api/products/categories?flowType=printing
const getCategories = async (req, res, next) => {
    try {
        // Show all (including inactive) if request comes from admin/super_admin role
        const role = req.user?.role || req.headers['x-user-role'];
        const showAll = ['admin', 'super_admin'].includes(role) || req.query.showAll === 'true';
        const data = await categoryService.getAllCategories(req.query.flowType, showAll);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

// GET /api/products/categories/:slug
const getCategoryBySlug = async (req, res, next) => {
    try {
        const data = await categoryService.getCategoryBySlug(req.params.slug);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

// GET /api/products/categories/:id/subcategories
const getSubcategories = async (req, res, next) => {
    try {
        const data = await categoryService.getSubcategoriesByCategory(req.params.id);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

// POST /api/products/categories  [admin]
const createCategory = async (req, res, next) => {
    try {
        if (!req.body.slug) req.body.slug = slugify(req.body.name);
        const data = await categoryService.createCategory(req.body);
        return sendCreated(res, data);
    } catch (err) {
        next(err);
    }
};

// POST /api/products/categories/subcategories  [admin]
const createSubcategory = async (req, res, next) => {
    try {
        if (!req.body.slug) req.body.slug = slugify(req.body.name);
        const data = await categoryService.createSubcategory(req.body);
        return sendCreated(res, data);
    } catch (err) {
        next(err);
    }
};

// PUT /api/products/categories/:id  [admin]
const updateCategory = async (req, res, next) => {
    try {
        const data = await categoryService.updateCategory(req.params.id, req.body);
        return sendSuccess(res, data, 'Category updated');
    } catch (err) {
        next(err);
    }
};

// DELETE /api/products/categories/:id  [admin]
const deleteCategory = async (req, res, next) => {
    try {
        await categoryService.deleteCategory(req.params.id);
        return sendSuccess(res, null, 'Category deleted');
    } catch (err) {
        next(err);
    }
};

// PUT /api/products/subcategories/:id  [admin]
const updateSubcategory = async (req, res, next) => {
    try {
        const data = await categoryService.updateSubcategory(req.params.id, req.body);
        return sendSuccess(res, data, 'Subcategory updated');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getCategories,
    getCategoryBySlug,
    getSubcategories,
    createCategory,
    createSubcategory,
    updateCategory,
    updateSubcategory,
    deleteCategory,
};
