const Notification = require('../models/notification.model');
const { sendEmail } = require('./email.service');
const { paginate, paginateMeta } = require('../../../../shared/utils/pagination');
const logger = require('../../../../shared/utils/logger');
const { emitToUser, emitToRole } = require('../websocket/socket-manager');

const buildAccessFilter = (userId, role, extraFilter = {}) => {
    const access = [];

    if (userId) {
        access.push({ userId });
    }

    if (role) {
        access.push({ audienceRoles: role });
    }

    if (!access.length) {
        return extraFilter;
    }

    if (Object.keys(extraFilter).length === 0) {
        return { $or: access };
    }

    return { $and: [extraFilter, { $or: access }] };
};

const createNotification = async (data) => {
    const notification = await Notification.create(data);

    // Fire-and-forget email if type is email
    if (data.type === 'email' && data.metadata?.email) {
        sendEmail({
            to: data.metadata.email,
            subject: data.title,
            html: `<p>${data.message}</p>`,
        })
            .then(async () => {
                notification.status = 'sent';
                await notification.save();
            })
            .catch(async (err) => {
                logger.error('Email send failed:', err.message);
                notification.status = 'failed';
                notification.error = err.message;
                await notification.save();
            });
    }

    // Emit real-time WebSocket event to the target user
    if (data.userId) {
        emitToUser(data.userId, 'notification:new', {
            notification: notification.toObject(),
        });
    }

    if (Array.isArray(data.audienceRoles)) {
        [...new Set(data.audienceRoles.filter(Boolean))].forEach((role) => {
            emitToRole(role, 'notification:new', {
                notification: notification.toObject(),
            });
        });
    }

    // Also notify admins/staff for system-level notifications
    if (data.category === 'system' || data.category === 'support') {
        emitToRole('admin', 'notification:new', {
            notification: notification.toObject(),
        });
    }

    return notification;
};

const getUserNotifications = async (userId, role, query) => {
    const { page, limit, skip } = paginate(query);
    const filter = {};
    if (query.isRead !== undefined) filter.isRead = query.isRead === 'true';
    if (query.category) filter.category = query.category;
    if (query.search) {
        const pattern = new RegExp(query.search, 'i');
        filter.$or = [{ title: pattern }, { message: pattern }];
    }

    const accessFilter = buildAccessFilter(userId, role, filter);

    const [notifications, total] = await Promise.all([
        Notification.find(accessFilter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Notification.countDocuments(accessFilter),
    ]);

    return { notifications, meta: paginateMeta(total, page, limit) };
};

const getNotificationSummary = async (userId, role) => {
    const accessFilter = buildAccessFilter(userId, role);
    const [unreadCount, categoryCounts, recentNotifications] = await Promise.all([
        Notification.countDocuments({ ...accessFilter, isRead: false }),
        Notification.aggregate([
            { $match: accessFilter },
            { $group: { _id: '$category', count: { $sum: 1 } } },
        ]),
        Notification.find(accessFilter).sort({ createdAt: -1 }).limit(5),
    ]);

    return {
        unread_count: unreadCount,
        category_counts: categoryCounts.reduce(
            (accumulator, row) => ({ ...accumulator, [row._id]: row.count }),
            {}
        ),
        recent_notifications: recentNotifications,
    };
};

const markAsRead = async (userId, role, notificationId) => {
    const notification = await Notification.findOneAndUpdate(
        buildAccessFilter(userId, role, { _id: notificationId }),
        { isRead: true },
        { new: true }
    );

    if (notification) {
        emitToUser(userId, 'notification:read', {
            notificationId: String(notification._id),
        });
    }

    return notification;
};

const markAllAsRead = async (userId, role) => {
    const result = await Notification.updateMany(
        buildAccessFilter(userId, role, { isRead: false }),
        { isRead: true }
    );

    emitToUser(userId, 'notification:allRead', {
        modifiedCount: result.modifiedCount,
    });

    return result;
};

module.exports = {
    createNotification,
    getUserNotifications,
    getNotificationSummary,
    markAsRead,
    markAllAsRead,
};
