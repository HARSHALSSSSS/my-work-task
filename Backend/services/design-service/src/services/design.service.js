const Design = require('../models/design.model');
const Template = require('../models/template.model');

const saveDesign = async (userId, data) => {
    return Design.create({ ...data, userId, isSaved: data.isSaved !== false });
};

const updateDesign = async (userId, designId, data) => {
    const design = await Design.findOneAndUpdate({ _id: designId, userId }, data, {
        new: true,
        runValidators: true,
    });
    if (!design) {
        const err = new Error('Design not found');
        err.statusCode = 404;
        throw err;
    }
    return design;
};

const getDesignById = async (userId, designId) => {
    const design = await Design.findOne({ _id: designId, userId }).populate(
        'templateId',
        'name category isPremium previewImage dimensions'
    );
    if (!design) {
        const err = new Error('Design not found');
        err.statusCode = 404;
        throw err;
    }
    return design;
};

const getUserDesigns = async (userId, { productId, finalized, savedOnly } = {}) => {
    const filter = { userId };
    if (productId) filter.productId = productId;
    if (finalized !== undefined) filter.isFinalized = finalized === 'true' || finalized === true;
    if (savedOnly !== undefined) filter.isSaved = savedOnly === 'true' || savedOnly === true;
    return Design.find(filter).sort({ updatedAt: -1 });
};

const markDesignApproved = async (userId, designId, orderId) => {
    const design = await Design.findOneAndUpdate(
        { _id: designId, userId },
        { isFinalized: true, isSaved: true, lastApprovedOrderId: orderId || '' },
        { new: true }
    );
    if (!design) {
        const err = new Error('Design not found');
        err.statusCode = 404;
        throw err;
    }
    return design;
};

const getTemplates = async ({ flowType, category, isPremium, productId } = {}) => {
    const filter = { isActive: true };
    if (flowType) filter.flowType = flowType;
    if (category) filter.category = category;
    if (isPremium !== undefined) filter.isPremium = isPremium === 'true' || isPremium === true;
    if (productId) filter.productId = productId;
    return Template.find(filter).sort({ sortOrder: 1, createdAt: -1 });
};


const getPremiumTemplates = async (productId, category) => {
    const filter = { isActive: true, isPremium: true };
    if (productId) filter.productId = productId;
    if (category) filter.category = category;
    return Template.find(filter).sort({ sortOrder: 1 });
};


const createBlankDesign = async (userId, { productId, flowType, dimensions }) => {
    const blankCanvas = {
        version: '5.3.0',
        objects: [],
        background: '#ffffff',
        width: dimensions?.width || 350,
        height: dimensions?.height || 200,
    };

    return Design.create({
        userId,
        productId,
        flowType,
        designType: 'normal',
        canvasJson: blankCanvas,
        dimensions,
        name: 'New Design',
        isFinalized: false,
    });
};


const createFromTemplate = async (userId, { productId, templateId, flowType }) => {
    const template = await Template.findById(templateId);
    if (!template) {
        const err = new Error('Template not found');
        err.statusCode = 404;
        throw err;
    }

    if (!template.isPremium) {
        const err = new Error('Selected template is not a premium template');
        err.statusCode = 400;
        throw err;
    }

    return Design.create({
        userId,
        productId,
        flowType,
        designType: 'premium',
        templateId,
        canvasJson: template.canvasJson,
        previewImage: template.previewImage,
        dimensions: template.dimensions,
        name: `${template.name} (edited)`,
        isFinalized: false,
    });
};

module.exports = {
    saveDesign,
    updateDesign,
    getDesignById,
    getUserDesigns,
    markDesignApproved,
    getTemplates,
    getPremiumTemplates,
    createBlankDesign,
    createFromTemplate,
};
