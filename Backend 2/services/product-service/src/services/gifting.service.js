const mongoose = require('mongoose');

const Product = require('../models/product.model');
const Category = require('../models/category.model');
const Subcategory = require('../models/subcategory.model');
const Banner = require('../models/banner.model');
const { paginate, paginateMeta } = require('../../../../shared/utils/pagination');

const createError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const giftingCategoryMatch = [{ section: 'gifting' }, { flowType: 'gifting' }];

const toObjectIdIfValid = (value) =>
    mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null;

const sanitizeUndefined = (payload) =>
    Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));

const parseCategoryOutput = (category) => {
    if (!category) return null;

    return {
        _id: category._id,
        name: category.name,
        slug: category.slug,
        image: category.image || '',
        description: category.description || '',
        starting_from: category.starting_from ?? null,
        section: category.section || category.flowType || 'gifting',
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

const attachResolvedRelations = async (products = []) => {
    const categoryIds = [
        ...new Set(
            products
                .map((product) => String(product.category || ''))
                .filter((value) => mongoose.Types.ObjectId.isValid(value))
        ),
    ];
    const subcategoryIds = [
        ...new Set(
            products
                .map((product) => String(product.subcategory || ''))
                .filter((value) => mongoose.Types.ObjectId.isValid(value))
        ),
    ];

    const [categories, subcategories] = await Promise.all([
        categoryIds.length
            ? Category.find({ _id: { $in: categoryIds } }).select(
                  'name slug image description starting_from section flowType sortOrder isActive'
              )
            : [],
        subcategoryIds.length
            ? Subcategory.find({ _id: { $in: subcategoryIds } }).select('name slug')
            : [],
    ]);

    const categoriesById = new Map(categories.map((category) => [String(category._id), category]));
    const subcategoriesById = new Map(
        subcategories.map((subcategory) => [String(subcategory._id), subcategory])
    );

    return products.map((product) => ({
        ...product,
        category: categoriesById.get(String(product.category || '')) || null,
        subcategory: subcategoriesById.get(String(product.subcategory || '')) || null,
    }));
};

const getSelectedVariant = (product, variantIndex) => {
    if (variantIndex === null || variantIndex === undefined || variantIndex === '') {
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

const getResolvedUnitPrice = (product, variant = null) => {
    const variantExtra = variant?.additional_price || 0;
    return Math.max(0, getBaseSalePrice(product) + variantExtra);
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

    return product.in_stock !== false;
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

const getDesignMode = (product) => {
    if (product.designMode) return product.designMode;

    const premiumEnabled = Boolean(product.giftOptions?.allowPremiumTemplates);
    const blankEnabled = Boolean(product.giftOptions?.allowBlankDesign);

    if (premiumEnabled && blankEnabled) return 'both';
    if (premiumEnabled) return 'premium';
    if (blankEnabled) return 'normal';
    return '';
};

const serializeGiftOptions = (product) => ({
    materials: product.giftOptions?.materials || [],
    sizes: product.giftOptions?.sizes || [],
    colors: product.giftOptions?.colors || [],
    canvas: product.giftOptions?.canvas?.width
        ? {
              width: product.giftOptions.canvas.width,
              height: product.giftOptions.canvas.height,
              unit: product.giftOptions.canvas.unit || 'mm',
          }
        : null,
    design_instructions: product.giftOptions?.designInstructions || '',
});

const serializeCustomization = (product) => {
    const designMode = getDesignMode(product);
    const premiumEnabled =
        designMode === 'premium' ||
        designMode === 'both' ||
        Boolean(product.giftOptions?.allowPremiumTemplates);
    const blankEnabled =
        designMode === 'normal' ||
        designMode === 'both' ||
        Boolean(product.giftOptions?.allowBlankDesign);

    return {
        requires_design: Boolean(product.requiresDesign),
        requires_upload:
            Boolean(product.requiresUpload) || Boolean(product.giftOptions?.supportsPhotoUpload),
        design_mode: designMode || null,
        supports_photos: Boolean(product.giftOptions?.supportsPhotoUpload),
        supports_names: Boolean(product.giftOptions?.supportsNameCustomization),
        supports_text: Boolean(product.giftOptions?.supportsTextCustomization),
        premium_design_available: premiumEnabled,
        start_design_available: blankEnabled,
        max_photos: product.giftOptions?.maxPhotos ?? 1,
        max_name_length: product.giftOptions?.maxNameLength ?? 0,
        max_text_length: product.giftOptions?.maxTextLength ?? 0,
        design_instructions: product.giftOptions?.designInstructions || '',
        canvas: product.giftOptions?.canvas?.width
            ? {
                  width: product.giftOptions.canvas.width,
                  height: product.giftOptions.canvas.height,
                  unit: product.giftOptions.canvas.unit || 'mm',
              }
            : null,
    };
};

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
    gift_options: serializeGiftOptions(product),
    customization: serializeCustomization(product),
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
    badge: product.badge || null,
    variants: (product.variants || []).map((variant, index) => serializeVariant(variant, index)),
    gift_options: serializeGiftOptions(product),
    customization: serializeCustomization(product),
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
});

const syncCategoryStartingPrice = async (categoryId) => {
    if (!categoryId) return;

    const products = await Product.find({
        flowType: 'gifting',
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
            { $or: giftingCategoryMatch },
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
        flowType: 'gifting',
        $or: [{ slug: value.toLowerCase() }, { name: new RegExp(`^${value}$`, 'i') }],
    }).select('_id');

    return subcategories.map((subcategory) => subcategory._id);
};

const buildListFilter = async (query = {}) => {
    const filter = { flowType: 'gifting', isActive: true };

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

    if (query.customizable === 'true') filter.requiresDesign = true;

    if (query.design_mode === 'premium') filter.designMode = { $in: ['premium', 'both'] };
    else if (query.design_mode === 'normal') filter.designMode = { $in: ['normal', 'both'] };
    else if (query.design_mode === 'both') filter.designMode = 'both';

    if (query.badge) filter.badge = query.badge;

    const searchQuery = query.search || query.q;
    if (searchQuery) {
        filter.$or = [
            { name: new RegExp(searchQuery, 'i') },
            { description: new RegExp(searchQuery, 'i') },
            { highlights: new RegExp(searchQuery, 'i') },
            { tags: new RegExp(searchQuery, 'i') },
        ];
    }

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
    return { sortOrder: 1, createdAt: -1 };
};

const getActiveBanners = async (placement) => {
    const now = new Date();

    const banners = await Banner.find({
        placement,
        is_active: true,
        section: { $in: ['gifting', 'all'] },
        $and: [
            { $or: [{ starts_at: null }, { starts_at: { $lte: now } }] },
            { $or: [{ ends_at: null }, { ends_at: { $gte: now } }] },
        ],
    }).sort({ createdAt: -1 });

    return banners.map(serializeBanner);
};

const listProducts = async (query = {}) => {
    const pagination = paginate({ ...query, limit: query.limit || 12 });
    const filter = await buildListFilter(query);

    if (filter.impossible) {
        return {
            products: [],
            meta: paginateMeta(0, pagination.page, pagination.limit),
        };
    }

    const [products, total] = await Promise.all([
        Product.find(filter)
            .sort(getProductSort(query.sort))
            .skip(pagination.skip)
            .limit(pagination.limit)
            .lean(),
        Product.countDocuments(filter),
    ]);

    const productsWithRelations = await attachResolvedRelations(products);

    return {
        products: productsWithRelations.map(serializeProductCard),
        meta: paginateMeta(total, pagination.page, pagination.limit),
    };
};

const getProduct = async (identifier) => {
    const objectId = toObjectIdIfValid(identifier);
    const product = await Product.findOne({
        flowType: 'gifting',
        isActive: true,
        ...(objectId ? { _id: objectId } : { slug: identifier }),
    })
        .populate('category', 'name slug image starting_from section')
        .populate('subcategory', 'name slug');

    if (!product) throw createError('Product not found', 404);
    return serializeProductDetail(product);
};

const searchProducts = async ({ q, ...query }) => {
    if (!q || !String(q).trim()) {
        throw createError('Query parameter q is required', 400);
    }

    return listProducts({ ...query, q });
};

const getHome = async () => {
    const [banners, categories, featuredProducts, customizableProducts, premiumDesigns] =
        await Promise.all([
            getActiveBanners('home_hero'),
            Category.find({ $or: giftingCategoryMatch, isActive: true }).sort({
                sortOrder: 1,
                name: 1,
            }),
            Product.find({ flowType: 'gifting', isActive: true, isFeatured: true })
                .populate('category', 'name slug image starting_from section')
                .populate('subcategory', 'name slug')
                .sort({ createdAt: -1 })
                .limit(8),
            Product.find({ flowType: 'gifting', isActive: true, requiresDesign: true })
                .populate('category', 'name slug image starting_from section')
                .populate('subcategory', 'name slug')
                .sort({ isFeatured: -1, createdAt: -1 })
                .limit(8),
            Product.find({
                flowType: 'gifting',
                isActive: true,
                designMode: { $in: ['premium', 'both'] },
            })
                .populate('category', 'name slug image starting_from section')
                .populate('subcategory', 'name slug')
                .sort({ isFeatured: -1, createdAt: -1 })
                .limit(8),
        ]);

    return {
        banners,
        categories: categories.map(parseCategoryOutput),
        featured_products: featuredProducts.map(serializeProductCard),
        customizable_products: customizableProducts.map(serializeProductCard),
        premium_designs: premiumDesigns.map(serializeProductCard),
    };
};

const getCategories = async () => {
    const categories = await Category.find({ $or: giftingCategoryMatch, isActive: true }).sort({
        sortOrder: 1,
        name: 1,
    });

    return categories.map(parseCategoryOutput);
};

const normalizeGiftOptions = (giftOptions = {}, designMode) => {
    const premiumEnabled =
        giftOptions.allow_premium_templates ?? ['premium', 'both'].includes(designMode);
    const blankEnabled =
        giftOptions.allow_blank_design ?? ['normal', 'both'].includes(designMode);

    return {
        materials: giftOptions.materials,
        sizes: giftOptions.sizes,
        colors: giftOptions.colors,
        supportsPhotoUpload: giftOptions.supports_photo_upload,
        supportsNameCustomization: giftOptions.supports_name_customization,
        supportsTextCustomization: giftOptions.supports_text_customization,
        maxPhotos: giftOptions.max_photos,
        maxNameLength: giftOptions.max_name_length,
        maxTextLength: giftOptions.max_text_length,
        allowPremiumTemplates: premiumEnabled,
        allowBlankDesign: blankEnabled,
        designInstructions: giftOptions.design_instructions,
        canvas: giftOptions.canvas,
    };
};

const deriveDesignMode = (payload) => {
    if (payload.design_mode) return payload.design_mode;

    const premiumEnabled = Boolean(payload.gift_options?.allow_premium_templates);
    const blankEnabled = Boolean(payload.gift_options?.allow_blank_design);

    if (premiumEnabled && blankEnabled) return 'both';
    if (premiumEnabled) return 'premium';
    if (blankEnabled) return 'normal';
    return '';
};

const mapProductPayload = (payload, userId, { partial = false } = {}) => {
    const designMode = deriveDesignMode(payload);
    const hasDesignConfigInput =
        payload.design_mode !== undefined ||
        payload.requires_design !== undefined ||
        payload.requires_upload !== undefined ||
        payload.gift_options !== undefined;
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
    const normalizedGiftOptions =
        payload.gift_options || (!partial && designMode)
            ? normalizeGiftOptions(payload.gift_options || {}, designMode)
            : undefined;

    const requiresDesign = hasDesignConfigInput
        ? payload.requires_design ??
          Boolean(
              designMode ||
                  normalizedGiftOptions?.allowPremiumTemplates ||
                  normalizedGiftOptions?.allowBlankDesign
          )
        : undefined;
    const requiresUpload = hasDesignConfigInput
        ? payload.requires_upload ?? Boolean(normalizedGiftOptions?.supportsPhotoUpload)
        : undefined;

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
        variants,
        giftOptions: normalizedGiftOptions,
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
        flowType: 'gifting',
        requiresDesign,
        requiresUpload,
        designMode: hasDesignConfigInput ? designMode || null : undefined,
    });

    if (!partial) {
        normalizedPayload.isActive = payload.is_active ?? true;
        normalizedPayload.isFeatured = payload.is_featured ?? false;
        normalizedPayload.free_shipping = payload.free_shipping ?? false;
        normalizedPayload.flowType = 'gifting';
        normalizedPayload.requiresDesign = requiresDesign ?? false;
        normalizedPayload.requiresUpload = requiresUpload ?? false;
    }

    return normalizedPayload;
};

const createProduct = async (payload, userId) => {
    const product = await Product.create(mapProductPayload(payload, userId));
    await syncCategoryStartingPrice(product.category);

    return serializeProductDetail(
        await Product.findById(product._id)
            .populate('category', 'name slug image starting_from section')
            .populate('subcategory', 'name slug')
    );
};

const updateProduct = async (id, payload, userId) => {
    const existingProduct = await Product.findOne({ _id: id, flowType: 'gifting' });
    if (!existingProduct) throw createError('Product not found', 404);

    const previousCategoryId = existingProduct.category?.toString();
    const product = await Product.findByIdAndUpdate(
        id,
        mapProductPayload(payload, userId, { partial: true }),
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
        { _id: id, flowType: 'gifting' },
        { isActive: false },
        { new: true }
    );

    if (!product) throw createError('Product not found', 404);
    await syncCategoryStartingPrice(product.category);
    return { _id: product._id, is_active: false };
};

const createCategory = async (payload) => {
    const category = await Category.create({
        name: payload.name,
        slug: payload.slug,
        image: payload.image || undefined,
        starting_from: payload.starting_from ?? null,
        section: 'gifting',
        flowType: 'gifting',
        sortOrder: payload.sort_order ?? 0,
        isActive: payload.is_active ?? true,
        description: payload.description || '',
    });

    return parseCategoryOutput(category);
};

const updateCategory = async (id, payload) => {
    const category = await Category.findOneAndUpdate(
        { _id: id, $or: giftingCategoryMatch },
        sanitizeUndefined({
            name: payload.name,
            slug: payload.slug,
            image: payload.image || undefined,
            starting_from: payload.starting_from,
            sortOrder: payload.sort_order,
            isActive: payload.is_active,
            description: payload.description,
            section: 'gifting',
            flowType: 'gifting',
        }),
        { new: true, runValidators: true }
    );

    if (!category) throw createError('Category not found', 404);
    return parseCategoryOutput(category);
};

const resolveCartItems = async ({ items, strict_stock = false }) => {
    const productIds = [...new Set(items.map((item) => item.product_id))];
    const products = await Product.find({
        _id: { $in: productIds },
        flowType: 'gifting',
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

        const unitPrice = getResolvedUnitPrice(product, variant);

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
            customization: serializeCustomization(product),
            gift_options: serializeGiftOptions(product),
        };
    });
};

module.exports = {
    listProducts,
    getProduct,
    searchProducts,
    getHome,
    getCategories,
    createProduct,
    updateProduct,
    deleteProduct,
    createCategory,
    updateCategory,
    resolveCartItems,
};
