const Product = require('../models/product.model');
const Variant = require('../models/variant.model');
const Category = require('../models/category.model');
const Subcategory = require('../models/subcategory.model');
const { paginate, paginateMeta } = require('../../../../shared/utils/pagination');

const createError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const validateAssociations = async (payload, existingProduct = null) => {
    const flowType = payload.flowType || existingProduct?.flowType;
    const categoryId = payload.category || existingProduct?.category;
    const subcategoryId =
        payload.subcategory !== undefined ? payload.subcategory : existingProduct?.subcategory;

    if (!flowType) throw createError('flowType is required', 400);
    if (!categoryId) throw createError('category is required', 400);

    const category = await Category.findById(categoryId);
    if (!category) throw createError('Category not found', 404);
    if (category.flowType !== flowType) {
        throw createError('Product flowType must match category flowType', 400);
    }

    if (subcategoryId) {
        const subcategory = await Subcategory.findById(subcategoryId);
        if (!subcategory) throw createError('Subcategory not found', 404);
        if (String(subcategory.category) !== String(category._id)) {
            throw createError('Subcategory must belong to the selected category', 400);
        }
        if (subcategory.flowType !== flowType) {
            throw createError('Subcategory flowType must match product flowType', 400);
        }
    }
};

const normalizeProductPayload = (payload, existingProduct = null) => {
    const normalized = { ...payload };
    const flowType = payload.flowType || existingProduct?.flowType;

    if (flowType === 'printing' && normalized.businessPrintType) {
        normalized.requiresDesign = payload.requiresDesign ?? existingProduct?.requiresDesign ?? true;
        normalized.designMode = payload.designMode ?? existingProduct?.designMode ?? 'both';
        normalized.requiresUpload = payload.requiresUpload ?? existingProduct?.requiresUpload ?? false;
    }

    if (flowType !== 'printing') {
        normalized.businessPrintType = '';
        normalized.designMode = '';
    }

    return normalized;
};

const getProducts = async (query) => {
    const { page, limit, skip } = paginate(query);
    const filter = { isActive: true };

    if (query.category) filter.category = query.category;
    if (query.subcategory) filter.subcategory = query.subcategory;
    if (query.flowType) filter.flowType = query.flowType;
    if (query.search) filter.name = { $regex: query.search, $options: 'i' };

    const [products, total] = await Promise.all([
        Product.find(filter)
            .populate('category', 'name slug')
            .populate('subcategory', 'name slug')
            .sort({ sortOrder: 1, createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Product.countDocuments(filter),
    ]);

    return { products, meta: paginateMeta(total, page, limit) };
};

const getProductById = async (id) => {
    const product = await Product.findById(id)
        .populate('category', 'name slug')
        .populate('subcategory', 'name slug');

    if (!product) {
        const err = new Error('Product not found');
        err.statusCode = 404;
        throw err;
    }

    const variants = await Variant.find({ product: id, isActive: true });
    return { ...product.toObject(), variants };
};

const getProductBySlug = async (slug) => {
    const product = await Product.findOne({ slug, isActive: true })
        .populate('category', 'name slug')
        .populate('subcategory', 'name slug');

    if (!product) {
        const err = new Error('Product not found');
        err.statusCode = 404;
        throw err;
    }

    const variants = await Variant.find({ product: product._id, isActive: true });
    return { ...product.toObject(), variants };
};

const createProduct = async (data) => {
    await validateAssociations(data);
    return Product.create(normalizeProductPayload(data));
};

const updateProduct = async (id, data) => {
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
        const err = new Error('Product not found');
        err.statusCode = 404;
        throw err;
    }

    await validateAssociations(data, existingProduct);

    const product = await Product.findByIdAndUpdate(id, normalizeProductPayload(data, existingProduct), {
        new: true,
        runValidators: true,
    });
    if (!product) {
        const err = new Error('Product not found');
        err.statusCode = 404;
        throw err;
    }
    return product;
};

const deleteProduct = async (id) => {
    const product = await Product.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!product) {
        const err = new Error('Product not found');
        err.statusCode = 404;
        throw err;
    }
    return product;
};

module.exports = {
    getProducts,
    getProductById,
    getProductBySlug,
    createProduct,
    updateProduct,
    deleteProduct,
};
