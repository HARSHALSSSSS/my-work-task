const Category = require('../models/category.model');
const Subcategory = require('../models/subcategory.model');

const createError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

/**
 * Get all categories with their subcategories nested inside.
 * Optional filter by flowType: printing | gifting | shopping
 * Pass showAll=true to include inactive categories (admin use)
 */
const getAllCategories = async (flowType, showAll = false) => {
    const filter = showAll ? {} : { isActive: true };
    if (flowType) filter.flowType = flowType;

    const categories = await Category.find(filter).sort('sortOrder');
    const subcategories = await Subcategory.find(showAll ? {} : { isActive: true }).sort('sortOrder');

    return categories.map((cat) => ({
        ...cat.toObject(),
        subcategories: subcategories.filter(
            (sub) => sub.category.toString() === cat._id.toString()
        ),
    }));
};

/**
 * Get a single category by slug with its subcategories.
 */
const getCategoryBySlug = async (slug) => {
    const category = await Category.findOne({ slug, isActive: true });
    if (!category) {
        const err = new Error('Category not found');
        err.statusCode = 404;
        throw err;
    }
    const subcategories = await Subcategory.find({
        category: category._id,
        isActive: true,
    }).sort('sortOrder');

    return { ...category.toObject(), subcategories };
};

/**
 * Get subcategories for a specific category.
 */
const getSubcategoriesByCategory = async (categoryId) => {
    return Subcategory.find({ category: categoryId, isActive: true }).sort('sortOrder');
};

const createCategory = async (data) => Category.create(data);

const createSubcategory = async (data) => {
    const category = await Category.findById(data.category);
    if (!category) throw createError('Category not found', 404);

    if (data.flowType && data.flowType !== category.flowType) {
        throw createError('Subcategory flowType must match its category flowType', 400);
    }

    return Subcategory.create({
        ...data,
        flowType: category.flowType,
    });
};

const updateCategory = async (id, data) => {
    const cat = await Category.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!cat) {
        const e = new Error('Category not found');
        e.statusCode = 404;
        throw e;
    }
    return cat;
};

const updateSubcategory = async (id, data) => {
    const existingSubcategory = await Subcategory.findById(id);
    if (!existingSubcategory) {
        const e = new Error('Subcategory not found');
        e.statusCode = 404;
        throw e;
    }

    const categoryId = data.category || existingSubcategory.category;
    const category = await Category.findById(categoryId);
    if (!category) throw createError('Category not found', 404);

    if (data.flowType && data.flowType !== category.flowType) {
        throw createError('Subcategory flowType must match its category flowType', 400);
    }

    const sub = await Subcategory.findByIdAndUpdate(
        id,
        {
            ...data,
            flowType: category.flowType,
        },
        { new: true, runValidators: true }
    );
    if (!sub) {
        const e = new Error('Subcategory not found');
        e.statusCode = 404;
        throw e;
    }
    return sub;
};

const deleteCategory = async (id) => {
    const cat = await Category.findByIdAndDelete(id);
    if (!cat) {
        const e = new Error('Category not found');
        e.statusCode = 404;
        throw e;
    }
    // Also delete associated subcategories
    await Subcategory.deleteMany({ category: id });
    return cat;
};

module.exports = {
    getAllCategories,
    getCategoryBySlug,
    getSubcategoriesByCategory,
    createCategory,
    createSubcategory,
    updateCategory,
    updateSubcategory,
    deleteCategory,
};
