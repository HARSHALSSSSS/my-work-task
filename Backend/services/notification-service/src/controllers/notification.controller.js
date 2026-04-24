const notificationService = require('../services/notification.service');
const { sendSuccess, sendCreated } = require('../../../../shared/utils/response');

const getNotifications = async (req, res, next) => {
    try {
        const data = await notificationService.getUserNotifications(
            req.headers['x-user-id'],
            req.headers['x-user-role'],
            req.query
        );
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const getSummary = async (req, res, next) => {
    try {
        const data = await notificationService.getNotificationSummary(
            req.headers['x-user-id'],
            req.headers['x-user-role']
        );
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const markRead = async (req, res, next) => {
    try {
        const data = await notificationService.markAsRead(
            req.headers['x-user-id'],
            req.headers['x-user-role'],
            req.params.id
        );
        return sendSuccess(res, data, 'Marked as read');
    } catch (err) {
        next(err);
    }
};

const markAllRead = async (req, res, next) => {
    try {
        await notificationService.markAllAsRead(
            req.headers['x-user-id'],
            req.headers['x-user-role']
        );
        return sendSuccess(res, null, 'All notifications marked as read');
    } catch (err) {
        next(err);
    }
};

// Internal endpoint — called by other services
const createNotification = async (req, res, next) => {
    try {
        const data = await notificationService.createNotification(req.body);
        return sendCreated(res, data);
    } catch (err) {
        next(err);
    }
};

module.exports = { getNotifications, getSummary, markRead, markAllRead, createNotification };
