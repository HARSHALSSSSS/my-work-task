const analyticsService = require('../services/analytics.service');
const { sendSuccess } = require('../../../../shared/utils/response');

const getDashboard = async (req, res, next) => {
    try {
        const data = await analyticsService.getDashboardStats();
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

module.exports = { getDashboard };
