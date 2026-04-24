const mongoose = require('mongoose');

const Product = require('../models/product.model');
const Category = require('../models/category.model');
const Subcategory = require('../models/subcategory.model');
const Banner = require('../models/banner.model');
const { paginate, paginateMeta } = require('../../../../shared/utils/pagination');

const TRENDING_BADGES = ['trending', 'bestseller'];

const createError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const toObjectIdIfValid = (value) =>
    mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null;

const sanitizeUndefined = (payload) =>
    Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));

const shoppingCategoryMatch = [{ section: 'shopping' }, { flowType: 'shopping' }];

const parseCategoryOutput = (category) => {
    if (!category) return null;

    return {
        _id: category._id,
        name: category.name,
        slug: category.slug,
        image: category.image || '',
        description: category.description || '',
        starting_from: category.starting_from ?? null,
        section: category.section || category.flowType || 'shopping',
        sort_order: category.sortOrder ?? 0,
        is_active: category.isActive !== false,
    };
};

const parseSubcategoryOutput = (subcategory) => {
    if (!subcategory) return null;

    return {
        _id: subcategory._id,
        name: subcategory.name,
        slug: subcategory.slug,
    };
};

const getSelectedVariant = (product, variantIndex) => {
    if (variantIndex === null || variantIndex === undefined || variantIndex === '') {
        if (Array.isArray(product.variants) && product.variants.length) {
            throw createError('Variant index is required', 400);
        }

        return null;
    }

    const parsedIndex = Number(variantIndex);

    if (!Number.isInteger(parsedIndex) || parsedIndex < 0) {
        throw createError('Invalid variant index', 400);
    }

    if (!Array.isArray(product.variants) || parsedIndex >= product.variants.length) {
        throw createError('Variant not found', 404);
    }

    return { index: parsedIndex, value: product.variants[parsedIndex] };
};

const getBaseSalePrice = (product) => {
    if (typeof product.sale_price === 'number') return product.sale_price;
    if (typeof product.discountedPrice === 'number') return product.discountedPrice;
    if (typeof product.mrp === 'number') return product.mrp;
    return product.basePrice || 0;
};

const getBaseMrp = (product) => {
    if (typeof product.mrp === 'number') return product.mrp;
    return product.basePrice || 0;
};

const getResolvedUnitPrice = (product, quantity, variant = null) => {
    const variantExtra = variant?.additional_price || 0;
    const baseSalePrice = getBaseSalePrice(product);
    const bulkPriceEligible =
        typeof product.bulk_price === 'number' &&
        typeof product.min_bulk_qty === 'number' &&
        quantity >= product.min_bulk_qty;

    const effectiveBase = bulkPriceEligible ? product.bulk_price : baseSalePrice;
    return Math.max(0, effectiveBase + variantExtra);
};

const getAvailableStock = (product, variant = null) => {
    if (variant) return variant.stock || 0;
    if (Array.isArray(product.variants) && product.variants.length) {
        return product.variants.reduce((sum, current) => sum + (current.stock || 0), 0);
    }
    return product.stock || 0;
};

const isProductInStock = (product) => {
    if (Array.isArray(product.variants) && product.variants.length) {
        return product.variants.some((variant) => (variant.stock || 0) > 0);
    }
    return Boolean(product.in_stock && (product.stock || 0) > 0);
};

const serializeVariant = (variant, index) => ({
    index,
    size: variant.size || '',
    size_label: variant.size_label || '',
    paper_type: variant.paper_type || '',
    cover_color: variant.cover_color || '',
    cover_color_name: variant.cover_color_name || '',
    stock: variant.stock || 0,
    additional_price: variant.additional_price || 0,
});

const serializeProductCard = (product) => ({
    _id: product._id,
    name: product.name,
    slug: product.slug,
    thumbnail: product.thumbnail || product.images?.[0] || '',
    mrp: getBaseMrp(product),
    sale_price: getBaseSalePrice(product),
    discount_pct: product.discount_pct || 0,
    badge: product.badge || null,
    in_stock: isProductInStock(product),
    brand: product.brand || '',
    highlights: product.highlights || [],
    category: parseCategoryOutput(product.category),
    subcategory: parseSubcategoryOutput(product.subcategory),
});

const serializeProductDetail = (product) => ({
    _id: product._id,
    name: product.name,
    slug: product.slug,
    sku: product.sku || '',
    category: parseCategoryOutput(product.category),
    subcategory: parseSubcategoryOutput(product.subcategory),
    brand: product.brand || '',
    description: product.description || '',
    highlights: product.highlights || [],
    mrp: getBaseMrp(product),
    sale_price: getBaseSalePrice(product),
    discount_pct: product.discount_pct || 0,
    bulk_price: product.bulk_price ?? null,
    min_bulk_qty: product.min_bulk_qty ?? null,
    badge: product.badge || null,
    is_deal_of_day: Boolean(product.is_deal_of_day),
    deal_expires_at: product.deal_expires_at || null,
    variants: (product.variants || []).map((variant, index) => serializeVariant(variant, index)),
    specs: {
        paper_weight: product.specs?.paper_weight || '',
        page_count: product.specs?.page_count || '',
        cover_material: product.specs?.cover_material || '',
        binding: product.specs?.binding || '',
        extras: product.specs?.extras || '',
        features: product.specs?.features || [],
    },
    images: product.images || [],
    thumbnail: product.thumbnail || product.images?.[0] || '',
    is_active: product.isActive !== false,
    is_featured: Boolean(product.isFeatured),
    free_shipping: Boolean(product.free_shipping),
    in_stock: isProductInStock(product),
    created_by: product.created_by || null,
    created_at: product.createdAt,
    updated_at: product.updatedAt,
});

const serializeBanner = (banner) => ({
    _id: banner._id,
    title: banner.title,
    subtitle: banner.subtitle || '',
    cta_text: banner.cta_text || '',
    cta_link: banner.cta_link || '',
    image: banner.image,
    bg_color: banner.bg_color || '',
    placement: banner.placement,
    section: banner.section,
    is_active: banner.is_active !== false,
    starts_at: banner.starts_at || null,
    ends_at: banner.ends_at || null,
    created_by: banner.created_by || null,
    created_at: banner.createdAt,
    updated_at: banner.updatedAt,
});

const syncCategoryStartingPrice = async (categoryId) => {
    if (!categoryId) return;

    const products = await Product.find({
        flowType: 'shopping',
        isActive: true,
        category: categoryId,
    }).select('mrp sale_price');

    const prices = products
        .map((product) => {
            if (typeof product.sale_price === 'number') return product.sale_price;
            if (typeof product.mrp === 'number') return product.mrp;
            return null;
        })
        .filter((price) => typeof price === 'number');

    const startingFrom = prices.length ? Math.min(...prices) : null;
    await Category.findByIdAndUpdate(categoryId, { starting_from: startingFrom });
};

const resolveCategoryFilter = async (value) => {
    if (!value) return null;

    const objectId = toObjectIdIfValid(value);
    if (objectId) return [objectId];

    const categories = await Category.find({
        $and: [
            { $or: shoppingCategoryMatch },
            { $or: [{ slug: value.toLowerCase() }, { name: new RegExp(`^${value}$`, 'i') }] },
        ],
    }).select('_id');

    return categories.map((category) => category._id);
};

const resolveSubcategoryFilter = async (value) => {
    if (!value) return null;

    const objectId = toObjectIdIfValid(value);
    if (objectId) return [objectId];

    const subcategories = await Subcategory.find({
        flowType: 'shopping',
        $or: [{ slug: value.toLowerCase() }, { name: new RegExp(`^${value}$`, 'i') }],
    }).select('_id');

    return subcategories.map((subcategory) => subcategory._id);
};

const buildShoppingListFilter = async (query = {}) => {
    const filter = { flowType: 'shopping', isActive: true };

    if (query.category) {
        const categoryIds = await resolveCategoryFilter(query.category);
        if (!categoryIds?.length) return { impossible: true };
        filter.category = { $in: categoryIds };
    }

    if (query.subcategory) {
        const subcategoryIds = await resolveSubcategoryFilter(query.subcategory);
        if (!subcategoryIds?.length) return { impossible: true };
        filter.subcategory = { $in: subcategoryIds };
    }

    if (query.badge) filter.badge = query.badge;

    const minPrice =
        query.min_price !== undefined && query.min_price !== '' ? Number(query.min_price) : null;
    const maxPrice =
        query.max_price !== undefined && query.max_price !== '' ? Number(query.max_price) : null;
    const priceExpressions = [];

    if (Number.isFinite(minPrice)) {
        priceExpressions.push({
            $gte: [{ $ifNull: ['$sale_price', '$mrp'] }, minPrice],
        });
    }

    if (Number.isFinite(maxPrice)) {
        priceExpressions.push({
            $lte: [{ $ifNull: ['$sale_price', '$mrp'] }, maxPrice],
        });
    }

    if (priceExpressions.length) {
        filter.$expr = priceExpressions.length === 1 ? priceExpressions[0] : { $and: priceExpressions };
    }

    return filter;
};

const getProductSort = (sort) => {
    if (sort === 'price_asc') return { sale_price: 1, mrp: 1, createdAt: -1 };
    if (sort === 'price_desc') return { sale_price: -1, mrp: -1, createdAt: -1 };
    return { createdAt: -1 };
};

const getActiveBanners = async (placement) => {
    const now = new Date();

    const banners = await Banner.find({
        placement,
        is_active: true,
        section: { $in: ['shopping', 'all'] },
        $and: [
            { $or: [{ starts_at: null }, { starts_at: { $lte: now } }] },
            { $or: [{ ends_at: null }, { ends_at: { $gte: now } }] },
        ],
    }).sort({ createdAt: -1 });

    return banners.map(serializeBanner);
};

const listProducts = async (query = {}) => {
    const pagination = paginate({ ...query, limit: query.limit || 12 });
    const filter = await buildShoppingListFilter(query);

    if (filter.impossible) {
        return {
            products: [],
            meta: paginateMeta(0, pagination.page, pagination.limit),
        };
    }

    const [products, total] = await Promise.all([
        Product.find(filter)
            .populate('category', 'name slug image starting_from section')
            .populate('subcategory', 'name slug')
            .sort(getProductSort(query.sort))
            .skip(pagination.skip)
            .limit(pagination.limit),
        Product.countDocuments(filter),
    ]);

    return {
        products: products.map(serializeProductCard),
        meta: paginateMeta(total, pagination.page, pagination.limit),
    };
};

const getProductBySlug = async (slug) => {
    // Support lookup by either slug or MongoDB _id
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(slug);
    const query = isObjectId
        ? { _id: slug, flowType: 'shopping', isActive: true }
        : { slug, flowType: 'shopping', isActive: true };

    const product = await Product.findOne(query)
        .populate('category', 'name slug image starting_from section')
        .populate('subcategory', 'name slug');

    if (!product) throw createError('Product not found', 404);
    return serializeProductDetail(product);
};

const getDealProduct = async () => {
    const product = await Product.findOne({
        flowType: 'shopping',
        isActive: true,
        is_deal_of_day: true,
        deal_expires_at: { $gt: new Date() },
    })
        .populate('category', 'name slug image starting_from section')
        .populate('subcategory', 'name slug')
        .sort({ deal_expires_at: 1, createdAt: -1 });

    if (!product) return null;

    return {
        ...serializeProductDetail(product),
        time_remaining_seconds: Math.max(
            0,
            Math.floor((new Date(product.deal_expires_at).getTime() - Date.now()) / 1000)
        ),
    };
};

const getTrendingProducts = async () => {
    const products = await Product.find({
        flowType: 'shopping',
        isActive: true,
        badge: { $in: TRENDING_BADGES },
    })
        .populate('category', 'name slug image starting_from section')
        .populate('subcategory', 'name slug')
        .sort({ isFeatured: -1, createdAt: -1 })
        .limit(8);

    return products.map(serializeProductCard);
};

const searchProducts = async ({ q, ...query }) => {
    if (!q || !String(q).trim()) {
        throw createError('Query parameter q is required', 400);
    }

    const pagination = paginate({ ...query, limit: query.limit || 12 });
    const filter = { flowType: 'shopping', isActive: true };

    if (q) {
        const categoryMatches = await Category.find({
            $and: [
                { $or: shoppingCategoryMatch },
                { $or: [{ name: new RegExp(q, 'i') }, { slug: new RegExp(q, 'i') }] },
            ],
        }).select('_id');

        const subcategoryMatches = await Subcategory.find({
            flowType: 'shopping',
            $or: [{ name: new RegExp(q, 'i') }, { slug: new RegExp(q, 'i') }],
        }).select('_id');

        filter.$or = [
            { name: new RegExp(q, 'i') },
            { highlights: new RegExp(q, 'i') },
            { category: { $in: categoryMatches.map((category) => category._id) } },
            { subcategory: { $in: subcategoryMatches.map((subcategory) => subcategory._id) } },
        ];
    }

    const [products, total] = await Promise.all([
        Product.find(filter)
            .populate('category', 'name slug image starting_from section')
            .populate('subcategory', 'name slug')
            .sort(getProductSort(query.sort))
            .skip(pagination.skip)
            .limit(pagination.limit),
        Product.countDocuments(filter),
    ]);

    return {
        products: products.map(serializeProductCard),
        meta: paginateMeta(total, pagination.page, pagination.limit),
    };
};

const getHome = async () => {
    const [banners, categories, deal_of_day, trending_products, featuredProducts] = await Promise.all([
        getActiveBanners('home_hero'),
        Category.find({ $or: shoppingCategoryMatch, isActive: true }).sort({
            sortOrder: 1,
            name: 1,
        }),
        getDealProduct(),
        getTrendingProducts(),
        Product.find({ flowType: 'shopping', isActive: true, isFeatured: true })
            .populate('category', 'name slug image starting_from section')
            .populate('subcategory', 'name slug')
            .sort({ createdAt: -1 })
            .limit(8),
    ]);

    return {
        banners,
        categories: categories.map(parseCategoryOutput),
        deal_of_day,
        trending_products,
        featured_products: featuredProducts.map(serializeProductCard),
    };
};

const getCategories = async () => {
    const categories = await Category.find({ $or: shoppingCategoryMatch, isActive: true }).sort({
        sortOrder: 1,
        name: 1,
    });

    return categories.map(parseCategoryOutput);
};

const mapShoppingProductPayload = (payload, userId, { partial = false } = {}) => {
    const createdBy =
        payload.created_by ||
        (mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : undefined);
    const variants = payload.variants;
    const variantStock =
        Array.isArray(variants) && variants.length
            ? variants.reduce((sum, variant) => sum + (variant.stock || 0), 0)
            : undefined;
    const derivedInStock =
        Array.isArray(variants) && variants.length
            ? variants.some((variant) => (variant.stock || 0) > 0)
            : payload.in_stock;

    const normalizedPayload = sanitizeUndefined({
        name: payload.name,
        slug: payload.slug,
        sku: payload.sku || undefined,
        category: payload.category || undefined,
        subcategory: payload.subcategory || undefined,
        brand: payload.brand,
        description: payload.description,
        highlights: payload.highlights,
        mrp: payload.mrp,
        sale_price: payload.sale_price,
        bulk_price: payload.bulk_price,
        min_bulk_qty: payload.min_bulk_qty,
        badge: payload.badge === '' ? null : payload.badge,
        is_deal_of_day: payload.is_deal_of_day,
        deal_expires_at: payload.deal_expires_at,
        variants,
        specs: payload.specs,
        images: payload.images,
        thumbnail: payload.thumbnail || undefined,
        free_shipping: payload.free_shipping,
        in_stock: derivedInStock,
        stock: variantStock,
        basePrice: payload.mrp,
        discountedPrice: payload.sale_price ?? payload.mrp,
        sortOrder: payload.sort_order,
        isActive: payload.is_active,
        isFeatured: payload.is_featured,
        created_by: createdBy,
        flowType: 'shopping',
        requiresDesign: false,
        requiresUpload: false,
    });

    if (!partial) {
        normalizedPayload.isActive = payload.is_active ?? true;
        normalizedPayload.isFeatured = payload.is_featured ?? false;
        normalizedPayload.free_shipping = payload.free_shipping ?? false;
        normalizedPayload.flowType = 'shopping';
    }

    return normalizedPayload;
};

const createProduct = async (payload, userId) => {
    const product = await Product.create(mapShoppingProductPayload(payload, userId));
    await syncCategoryStartingPrice(product.category);
    return serializeProductDetail(
        await Product.findById(product._id)
            .populate('category', 'name slug image starting_from section')
            .populate('subcategory', 'name slug')
    );
};

const updateProduct = async (id, payload, userId) => {
    const existingProduct = await Product.findOne({ _id: id, flowType: 'shopping' });
    if (!existingProduct) throw createError('Product not found', 404);

    const previousCategoryId = existingProduct.category?.toString();
    const product = await Product.findByIdAndUpdate(
        id,
        mapShoppingProductPayload(payload, userId, { partial: true }),
        { new: true, runValidators: true }
    )
        .populate('category', 'name slug image starting_from section')
        .populate('subcategory', 'name slug');

    await syncCategoryStartingPrice(product.category);
    if (previousCategoryId && previousCategoryId !== String(product.category?._id || product.category)) {
        await syncCategoryStartingPrice(previousCategoryId);
    }

    return serializeProductDetail(product);
};

const deleteProduct = async (id) => {
    const product = await Product.findOneAndUpdate(
        { _id: id, flowType: 'shopping' },
        { isActive: false },
        { new: true }
    );

    if (!product) throw createError('Product not found', 404);
    await syncCategoryStartingPrice(product.category);
    return { _id: product._id, is_active: false };
};

const patchDeal = async (id, payload) => {
    const update = {
        is_deal_of_day: payload.is_deal_of_day,
        deal_expires_at: payload.is_deal_of_day ? payload.deal_expires_at : null,
        badge: payload.is_deal_of_day ? 'deal' : null,
    };

    const product = await Product.findOneAndUpdate({ _id: id, flowType: 'shopping' }, update, {
        new: true,
        runValidators: true,
    })
        .populate('category', 'name slug image starting_from section')
        .populate('subcategory', 'name slug');

    if (!product) throw createError('Product not found', 404);
    return serializeProductDetail(product);
};

const createCategory = async (payload) => {
    const category = await Category.create({
        name: payload.name,
        slug: payload.slug,
        image: payload.image || undefined,
        starting_from: payload.starting_from ?? null,
        section: 'shopping',
        flowType: 'shopping',
        sortOrder: payload.sort_order ?? 0,
        isActive: payload.is_active ?? true,
        description: payload.description || '',
    });

    return parseCategoryOutput(category);
};

const updateCategory = async (id, payload) => {
    const category = await Category.findOneAndUpdate(
        { _id: id, $or: shoppingCategoryMatch },
        sanitizeUndefined({
            name: payload.name,
            slug: payload.slug,
            image: payload.image || undefined,
            starting_from: payload.starting_from,
            sortOrder: payload.sort_order,
            isActive: payload.is_active,
            description: payload.description,
            section: 'shopping',
            flowType: 'shopping',
        }),
        { new: true, runValidators: true }
    );

    if (!category) throw createError('Category not found', 404);
    return parseCategoryOutput(category);
};

const createBanner = async (payload, userId) => {
    const createdBy =
        payload.created_by ||
        (mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : undefined);

    const banner = await Banner.create({
        ...payload,
        created_by: createdBy,
    });

    return serializeBanner(banner);
};

const updateBanner = async (id, payload) => {
    const banner = await Banner.findByIdAndUpdate(id, sanitizeUndefined(payload), {
        new: true,
        runValidators: true,
    });

    if (!banner) throw createError('Banner not found', 404);
    return serializeBanner(banner);
};

const deleteBanner = async (id) => {
    const banner = await Banner.findByIdAndDelete(id);
    if (!banner) throw createError('Banner not found', 404);
    return { _id: id };
};

const resolveCartItems = async ({ items, strict_stock = false }) => {
    const productIds = [...new Set(items.map((item) => item.product_id))];
    const products = await Product.find({
        _id: { $in: productIds },
        flowType: 'shopping',
        isActive: true,
    })
        .populate('category', 'name slug image starting_from section')
        .populate('subcategory', 'name slug');

    const productsById = new Map(products.map((product) => [String(product._id), product]));

    return items.map((item) => {
        const product = productsById.get(String(item.product_id));
        if (!product) throw createError('Product not found', 404);

        const selectedVariantMeta = getSelectedVariant(product, item.variant_index);
        const variant = selectedVariantMeta?.value || null;
        const variantIndex = selectedVariantMeta?.index ?? null;
        const availableStock = getAvailableStock(product, variant);

        if (strict_stock && availableStock < item.qty) {
            throw createError(`Insufficient stock for ${product.name}`, 409);
        }

        const unitPrice = getResolvedUnitPrice(product, item.qty, variant);

        return {
            item_id: item.item_id || null,
            product_id: String(product._id),
            product_name: product.name,
            product_slug: product.slug,
            sku: product.sku || '',
            thumbnail: product.thumbnail || product.images?.[0] || '',
            brand: product.brand || '',
            qty: item.qty,
            mrp: getBaseMrp(product) + (variant?.additional_price || 0),
            sale_price: unitPrice,
            discount_pct: product.discount_pct || 0,
            badge: product.badge || null,
            in_stock: availableStock > 0,
            available_stock: availableStock,
            free_shipping: Boolean(product.free_shipping),
            variant_index: variantIndex,
            variant: variant ? serializeVariant(variant, variantIndex) : null,
            unit_price: unitPrice,
            total_price: unitPrice * item.qty,
            category: parseCategoryOutput(product.category),
            subcategory: parseSubcategoryOutput(product.subcategory),
        };
    });
};

module.exports = {
    listProducts,
    getProductBySlug,
    getDealProduct,
    getTrendingProducts,
    searchProducts,
    getHome,
    getCategories,
    createProduct,
    updateProduct,
    deleteProduct,
    patchDeal,
    createCategory,
    updateCategory,
    createBanner,
    updateBanner,
    deleteBanner,
    resolveCartItems,
    syncCategoryStartingPrice,
};
