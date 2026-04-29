const designService = require('../services/design.service');
const { sendSuccess, sendCreated } = require('../../../../shared/utils/response');

const saveDesign = async (req, res, next) => {
    try {
        const data = await designService.saveDesign(req.headers['x-user-id'], req.body);
        return sendCreated(res, data, 'Design saved');
    } catch (err) {
        next(err);
    }
};

const updateDesign = async (req, res, next) => {
    try {
        const data = await designService.updateDesign(
            req.headers['x-user-id'],
            req.params.id,
            req.body
        );
        return sendSuccess(res, data, 'Design updated');
    } catch (err) {
        next(err);
    }
};


const getDesign = async (req, res, next) => {
    try {
        const data = await designService.getDesignById(req.headers['x-user-id'], req.params.id);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const getMyDesigns = async (req, res, next) => {
    try {
        const data = await designService.getUserDesigns(
            req.headers['x-user-id'],
            {
                productId: req.query.productId,
                finalized: req.query.finalized,
                savedOnly: req.query.savedOnly,
            }
        );
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const markApproved = async (req, res, next) => {
    try {
        const data = await designService.markDesignApproved(
            req.headers['x-user-id'],
            req.params.id,
            req.body.orderId
        );
        return sendSuccess(res, data, 'Design approved');
    } catch (err) {
        next(err);
    }
};

const getTemplates = async (req, res, next) => {
    try {
        const data = await designService.getTemplates(req.query);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const getPremiumTemplates = async (req, res, next) => {
    try {
        const data = await designService.getPremiumTemplates(
            req.query.productId,
            req.query.category
        );
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const getProductFrames = async (req, res, next) => {
    try {
        const data = await designService.getProductFrames(
            req.headers['x-user-id'],
            req.params.productId
        );
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const createBlankDesign = async (req, res, next) => {
    try {
        const data = await designService.createBlankDesign(req.headers['x-user-id'], req.body);
        return sendCreated(res, data, 'Blank canvas created');
    } catch (err) {
        next(err);
    }
};

const createFromTemplate = async (req, res, next) => {
    try {
        const data = await designService.createFromTemplate(req.headers['x-user-id'], req.body);
        return sendCreated(res, data, 'Design created from template');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    saveDesign,
    updateDesign,
    getDesign,
    getMyDesigns,
    getTemplates,
    getPremiumTemplates,
    getProductFrames,
    createBlankDesign,
    createFromTemplate,
    markApproved,
};
