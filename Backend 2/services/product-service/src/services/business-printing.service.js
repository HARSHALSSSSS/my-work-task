const mongoose = require('mongoose');
const Product = require('../models/product.model');
const BusinessPrintConfig = require('../models/business-print-config.model');
const { SERVICE_PACKAGES } = require('../config/print-types');
const { paginate, paginateMeta } = require('../../../../shared/utils/pagination');
const { searchPickupLocations } = require('./shop-search.service');

const createError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const serializeBusinessProduct = (product) => ({
    _id: product._id,
    name: product.name,
    slug: product.slug,
    business_print_type: product.businessPrintType || '',
    category: product.category,
    subcategory: product.subcategory,
    description: product.description || '',
    thumbnail: product.thumbnail || product.images?.[0] || '',
    images: product.images || [],
    base_price: product.basePrice || 0,
    discounted_price: product.discountedPrice ?? product.basePrice ?? 0,
    requires_design: product.requiresDesign !== false,
    design_mode: product.designMode || 'both',
    is_featured: Boolean(product.isFeatured),
    sort_order: product.sortOrder || 0,
});

/**
 * Get business printing types from database categories
 * Only returns categories that have actual products added by admin
 */
const getBusinessPrintingTypes = async () => {
    try {
        // Get unique business print types from products that admin has actually added
        const businessTypes = await Product.aggregate([
            {
                $match: {
                    flowType: 'printing',
                    businessPrintType: { $ne: '', $exists: true },
                    isActive: true
                }
            },
            {
                $group: {
                    _id: '$businessPrintType',
                    name: { $first: '$businessPrintTypeName' },
                    description: { $first: '$businessPrintTypeDescription' },
                    count: { $sum: 1 },
                    minPrice: { $min: '$basePrice' },
                    maxPrice: { $max: '$basePrice' },
                    isFeatured: { $max: '$isFeatured' },
                    thumbnail: { $first: '$thumbnail' },
                    // Get the first product's category info for better naming
                    categoryName: { $first: '$category.name' },
                    sampleProduct: { $first: '$$ROOT' }
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'sampleProduct.category',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            {
                $project: {
                    id: '$_id',
                    name: {
                        $switch: {
                            branches: [
                                { case: { $eq: ['$_id', 'business_card'] }, then: 'Business Cards' },
                                { case: { $eq: ['$_id', 'flyers'] }, then: 'Flyers & Leaflets' },
                                { case: { $eq: ['$_id', 'leaflets'] }, then: 'Flyers & Leaflets' },
                                { case: { $eq: ['$_id', 'brochures'] }, then: 'Brochures' },
                                { case: { $eq: ['$_id', 'posters'] }, then: 'Posters' },
                                { case: { $eq: ['$_id', 'letterheads'] }, then: 'Letterheads' },
                                { case: { $eq: ['$_id', 'custom_stationery'] }, then: 'Custom Stationery' }
                            ],
                            default: { 
                                $concat: [
                                    { $toUpper: { $substr: ['$_id', 0, 1] } },
                                    { $substr: ['$_id', 1, -1] }
                                ]
                            }
                        }
                    },
                    description: {
                        $switch: {
                            branches: [
                                { case: { $eq: ['$_id', 'business_card'] }, then: 'Premium cardstock with soft-touch lamination and metallic foil options.' },
                                { case: { $eq: ['$_id', 'flyers'] }, then: 'Perfect for high-impact marketing campaigns and local promotions.' },
                                { case: { $eq: ['$_id', 'leaflets'] }, then: 'Perfect for high-impact marketing campaigns and local promotions.' },
                                { case: { $eq: ['$_id', 'brochures'] }, then: 'Elegant multi-page layouts for detailed product catalogs and services.' },
                                { case: { $eq: ['$_id', 'posters'] }, then: 'Large format prints with stunning color accuracy and heavy-duty paper.' },
                                { case: { $eq: ['$_id', 'letterheads'] }, then: 'Professional corporate identity stationery for all your official documents.' },
                                { case: { $eq: ['$_id', 'custom_stationery'] }, then: 'Bespoke notebooks, envelopes, and desktop items tailored to your brand.' }
                            ],
                            default: 'Professional printing services for your business needs.'
                        }
                    },
                    route: { $concat: ['/printing/business-printing/', '$_id'] },
                    cta_text: { 
                        $concat: ['Explore ', {
                            $switch: {
                                branches: [
                                    { case: { $eq: ['$_id', 'business_card'] }, then: 'Business Cards' },
                                    { case: { $eq: ['$_id', 'flyers'] }, then: 'Flyers' },
                                    { case: { $eq: ['$_id', 'leaflets'] }, then: 'Leaflets' },
                                    { case: { $eq: ['$_id', 'brochures'] }, then: 'Brochures' },
                                    { case: { $eq: ['$_id', 'posters'] }, then: 'Posters' },
                                    { case: { $eq: ['$_id', 'letterheads'] }, then: 'Letterheads' },
                                    { case: { $eq: ['$_id', 'custom_stationery'] }, then: 'Stationery' }
                                ],
                                default: '$_id'
                            }
                        }]
                    },
                    base_price: '$minPrice',
                    max_price: '$maxPrice',
                    is_featured: { $toBool: '$isFeatured' },
                    product_count: '$count',
                    thumbnail: '$thumbnail'
                }
            },
            {
                $sort: { is_featured: -1, product_count: -1, name: 1 }
            }
        ]);

        return businessTypes;
    } catch (error) {
        console.error('Error fetching business printing types:', error);
        return [];
    }
};

const getBusinessPrintingHome = async () => {
    const featuredProducts = await Product.find({
        flowType: 'printing',
        businessPrintType: { $ne: '' },
        isActive: true,
        isFeatured: true,
    })
        .populate('category', 'name slug')
        .populate('subcategory', 'name slug')
        .sort({ sortOrder: 1, createdAt: -1 })
        .limit(8);

    const businessTypes = await getBusinessPrintingTypes();

    return {
        sections: [
            {
                id: 'business_printing',
                name: 'Business Printing',
                description: 'Premium print materials for brands, campaigns, and corporate teams.',
                route: '/printing/business-printing',
                cta_text: 'Explore Business Printing',
            },
        ],
        business_types: businessTypes,
        featured_products: featuredProducts.map(serializeBusinessProduct),
        service_packages: SERVICE_PACKAGES,
    };
};

/**
 * Get all business printing products grouped by type.
 * Supports filter by businessPrintType (e.g., ?type=business_card).
 */
const getBusinessProducts = async (query = {}) => {
    const { page, limit, skip } = paginate(query);
    const filter = {
        flowType: 'printing',
        businessPrintType: { $ne: '' },
        isActive: true,
    };

    if (query.type) filter.businessPrintType = query.type;
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

    return { products: products.map(serializeBusinessProduct), meta: paginateMeta(total, page, limit) };
};

/**
 * Get a single business printing product with its design options.
 */
const getBusinessProductById = async (identifier) => {
    const objectIdFilter = mongoose.Types.ObjectId.isValid(identifier) ? { _id: identifier } : null;
    const product = await Product.findOne({
        flowType: 'printing',
        businessPrintType: { $ne: '' },
        isActive: true,
        $or: [objectIdFilter, { slug: identifier }].filter(Boolean),
    })
        .populate('category', 'name slug')
        .populate('subcategory', 'name slug');

    if (!product) {
        throw createError('Product not found', 404);
    }
    return serializeBusinessProduct(product);
};

/**
 * Save a business print configuration after user finalizes design.
 */
const saveBusinessPrintConfig = async (userId, data) => {
    if (!userId) throw createError('Authentication is required', 401);

    if (data.deliveryMethod === 'pickup' && !data.shopId) {
        throw createError('shopId is required for pickup orders', 400);
    }

    if (data.deliveryMethod === 'delivery' && !data.servicePackage) {
        throw createError('servicePackage is required for delivery orders', 400);
    }

    const product = await Product.findOne({
        _id: data.productId,
        flowType: 'printing',
        businessPrintType: data.businessPrintType,
        isActive: true,
    }).lean();

    if (!product) throw createError('Business printing product not found', 404);

    const supportedDesignMode = product.designMode || 'both';
    if (supportedDesignMode !== 'both' && supportedDesignMode !== data.designType) {
        throw createError(`This product supports ${supportedDesignMode} design only`, 400);
    }

    const config = await BusinessPrintConfig.create({ ...data, userId });
    return config;
};

/**
 * Get a saved business print config.
 */
const getBusinessPrintConfig = async (configId, userId) => {
    const config = await BusinessPrintConfig.findOne({ _id: configId, userId })
        .populate('productId', 'name thumbnail basePrice discountedPrice')
        .populate('shopId', 'name address city pincode phone workingHours');

    if (!config) {
        const err = new Error('Business print configuration not found');
        err.statusCode = 404;
        throw err;
    }
    return config;
};

/**
 * Get service packages (same as document printing).
 */
const getServicePackages = () => SERVICE_PACKAGES;

/**
 * Get pickup locations (supports both pincode and geospatial search).
 */
const getPickupLocations = async (query) => {
    return searchPickupLocations(query);
};

/**
 * Get uploaded files for a user
 */
const getUploadedFiles = async (userId) => {
    if (!userId) throw createError('Authentication is required', 401);
    
    // Return mock files for now - in production, this would query a files collection
    return [
        {
            id: '1',
            name: 'document.pdf',
            size: 2048576,
            pages: 10,
            uploadedAt: new Date(),
        },
        {
            id: '2',
            name: 'design.jpg',
            size: 1024576,
            pages: 1,
            uploadedAt: new Date(),
        },
    ];
};

/**
 * Upload files for printing
 */
const uploadFiles = async (userId, files) => {
    if (!userId) throw createError('Authentication is required', 401);
    if (!files || files.length === 0) throw createError('No files provided', 400);
    
    const uploadedFiles = files.map((file, index) => ({
        id: `${Date.now()}_${index}`,
        name: file.originalname || file.filename,
        size: file.size,
        pages: Math.ceil(file.size / 100000), // Estimate pages
        uploadedAt: new Date(),
        mimetype: file.mimetype,
    }));
    
    return uploadedFiles;
};

module.exports = {
    getBusinessPrintingTypes,
    getBusinessPrintingHome,
    getBusinessProducts,
    getBusinessProductById,
    saveBusinessPrintConfig,
    getBusinessPrintConfig,
    getServicePackages,
    getPickupLocations,
    getUploadedFiles,
    uploadFiles,
};
