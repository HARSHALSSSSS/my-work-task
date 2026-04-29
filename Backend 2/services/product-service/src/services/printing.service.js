const PrintConfig = require('../models/print-config.model');
const { DOCUMENT_PRINT_TYPES, SERVICE_PACKAGES } = require('../config/print-types');
const { searchPickupLocations } = require('./shop-search.service');

const createError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

/**
 * Returns all 4 document print types with their available options.
 */
const getDocumentPrintTypes = () => Object.values(DOCUMENT_PRINT_TYPES);

const getDocumentPrintType = (typeId) => {
    const printType = DOCUMENT_PRINT_TYPES[typeId];
    if (!printType) throw createError('Document print type not found', 404);
    return printType;
};

const getPrintingHome = () => ({
    sections: [
        {
            id: 'document_printing',
            name: 'Document Printing',
            description: 'Print resumes, essays, projects, and personal documents.',
            cta_text: 'Start Document Print',
            route: '/printing/document-printing',
            supports_upload: true,
            requires_design: false,
        },
        {
            id: 'business_printing',
            name: 'Business Printing',
            description: 'Marketing materials, branded reports, business cards, and bulk orders.',
            cta_text: 'Start Business Print',
            route: '/printing/business-printing',
            supports_upload: false,
            requires_design: true,
        },
    ],
    document_types: getDocumentPrintTypes(),
    service_packages: SERVICE_PACKAGES,
});

/**
 * Returns delivery service packages (Standard / Express / Instant).
 */
const getServicePackages = () => SERVICE_PACKAGES;

/**
 * Returns shops near a given pincode or location.
 * Supports both pincode and lat/lng based search.
 */
const getPickupLocations = async (query) => {
    return searchPickupLocations(query);
};

/**
 * Saves a print configuration (draft).
 * Called after user configures options and clicks "Add to cart" or "Continue to Pay".
 */
const savePrintConfig = async (userId, data) => {
    if (!userId) throw createError('Authentication is required', 401);

    const printTypeConfig = getDocumentPrintType(data.printType);

    if (data.deliveryMethod === 'pickup' && !data.shopId) {
        throw createError('shopId is required for pickup orders', 400);
    }

    if (data.deliveryMethod === 'delivery' && !data.servicePackage) {
        throw createError('servicePackage is required for delivery orders', 400);
    }

    if (data.printType === 'standard_printing' && !data.printOutputType) {
        throw createError('printOutputType is required for standard printing', 400);
    }

    if (data.printType === 'soft_binding' && !data.coverPage) {
        throw createError('coverPage is required for soft binding', 400);
    }

    if (data.printType === 'thesis_binding') {
        if (!data.bindingCover) {
            throw createError('bindingCover is required for thesis binding', 400);
        }
        if (!data.cdRequired) {
            throw createError('cdRequired is required for thesis binding', 400);
        }
    }

    ['colorMode', 'pageSize', 'printSide', 'printOutputType', 'coverPage', 'bindingCover', 'cdRequired'].forEach(
        (field) => {
            if (!data[field] || !printTypeConfig.options[field]) return;
            if (!printTypeConfig.options[field].includes(data[field])) {
                throw createError(`${field} is not supported for ${data.printType}`, 400);
            }
        }
    );

    // Basic price estimation
    const basePrice = estimatePrice(data);

    const config = await PrintConfig.create({
        userId,
        ...data,
        estimatedPrice: basePrice,
        status: 'draft',
    });

    return config;
};

/**
 * Get a saved print config by ID (for order-service to reference).
 */
const getPrintConfig = async (configId, userId) => {
    const config = await PrintConfig.findOne({ _id: configId, userId }).populate(
        'shopId',
        'name address city pincode phone workingHours'
    );

    if (!config) {
        const err = new Error('Print configuration not found');
        err.statusCode = 404;
        throw err;
    }
    return config;
};

/**
 * Mark a print config as ordered (called by order-service after order placed).
 */
const markConfigOrdered = async (configId) => {
    return PrintConfig.findByIdAndUpdate(configId, { status: 'ordered' }, { new: true });
};

/**
 * Simple price estimator based on config.
 * Real pricing should come from product variants in DB.
 */
const estimatePrice = (data) => {
    const { printType, copies = 1, colorMode, deliveryMethod, servicePackage } = data;

    // Base price per page (rough estimate)
    const colorMultiplier = colorMode === 'color' ? 3 : 1;
    const basePricePerCopy =
        {
            standard_printing: 2,
            soft_binding: 15,
            spiral_binding: 20,
            thesis_binding: 80,
        }[printType] || 2;

    let total = basePricePerCopy * copies * colorMultiplier;

    // Add delivery package price
    if (deliveryMethod === 'delivery' && servicePackage) {
        const pkg = SERVICE_PACKAGES.find((p) => p.id === servicePackage);
        if (pkg) total += pkg.price;
    }

    return Math.round(total * 100) / 100;
};

module.exports = {
    getPrintingHome,
    getDocumentPrintTypes,
    getDocumentPrintType,
    getServicePackages,
    getPickupLocations,
    savePrintConfig,
    getPrintConfig,
    markConfigOrdered,
};
