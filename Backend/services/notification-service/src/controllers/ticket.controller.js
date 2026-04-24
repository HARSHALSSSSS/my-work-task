const Ticket = require('../models/ticket.model');
const { sendSuccess, sendCreated, sendError } = require('../../../../shared/utils/response');
const { paginate, paginateMeta } = require('../../../../shared/utils/pagination');
const { emitToUser, emitToRole, emitToTicket } = require('../websocket/socket-manager');

const HELP_CENTER = {
    faq_categories: [
        {
            id: 'order_tracking',
            title: 'Order Tracking',
            description: 'Check your order status, track shipments, and manage delivery preferences.',
            cta_text: 'Track Order',
        },
        {
            id: 'payments_refunds',
            title: 'Payments & Refunds',
            description: 'Manage billing information, view invoices, or request a refund.',
            cta_text: 'Billing Help',
        },
        {
            id: 'technical_support',
            title: 'Technical Support',
            description: 'Help with uploads, design tools, file formats, and formatting issues.',
            cta_text: 'Get Tech Support',
        },
    ],
    ticket_issue_types: [
        'order_issue',
        'payment_issue',
        'delivery_issue',
        'product_issue',
        'account_issue',
        'other',
    ],
    priority_options: ['low', 'medium', 'high', 'urgent'],
};

const emitInternalNotification = async ({ userId, title, message, metadata = {} }) => {
    const TicketNotification = require('../models/notification.model');
    if (!userId) return null;
    const notification = await TicketNotification.create({
        userId,
        type: 'in_app',
        title,
        message,
        category: 'support',
        metadata,
        status: 'sent',
    });

    // Push real-time WebSocket notification
    emitToUser(userId, 'notification:new', {
        notification: notification.toObject(),
    });

    return notification;
};

const createTicket = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'];
        const role = req.headers['x-user-role'] || 'user';
        const visibilityScope =
            role === 'vendor'
                ? 'vendor_internal'
                : role === 'delivery_partner'
                  ? 'delivery_internal'
                  : ['admin', 'staff'].includes(role)
                    ? 'ops_internal'
                    : 'customer';
        const ticket = await Ticket.create({
            ...req.body,
            userId,
            createdForRole: role,
            visibilityScope,
        });

        // Notify admins in real-time about new ticket
        emitToRole('admin', 'ticket:created', {
            ticket: ticket.toObject(),
        });
        emitToRole('staff', 'ticket:created', {
            ticket: ticket.toObject(),
        });

        return sendCreated(res, ticket, 'Ticket created');
    } catch (err) {
        next(err);
    }
};

const getTickets = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'];
        const role = req.headers['x-user-role'];
        const { page, limit, skip } = paginate(req.query);

        // Admin/staff see all tickets; customers see only their own
        const filter = ['admin', 'staff', 'super_admin'].includes(role) ? {} : { userId };
        if (req.query.status) filter.status = req.query.status;
        if (req.query.category) filter.category = req.query.category;
        if (req.query.search) {
            const pattern = new RegExp(req.query.search, 'i');
            filter.$or = [{ subject: pattern }, { description: pattern }, { orderId: pattern }];
        }

        const [tickets, total] = await Promise.all([
            Ticket.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Ticket.countDocuments(filter),
        ]);

        return sendSuccess(res, { tickets, meta: paginateMeta(total, page, limit) });
    } catch (err) {
        next(err);
    }
};

const getTicket = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'];
        const role = req.headers['x-user-role'];
        const filter = ['admin', 'staff', 'super_admin'].includes(role)
            ? { _id: req.params.id }
            : { _id: req.params.id, userId };

        const ticket = await Ticket.findOne(filter);
        if (!ticket) return sendError(res, 'Ticket not found', 404);
        return sendSuccess(res, ticket);
    } catch (err) {
        next(err);
    }
};

const getTicketSummary = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'];
        const role = req.headers['x-user-role'];
        const filter = ['admin', 'staff', 'super_admin'].includes(role) ? {} : { userId };

        const [summaryRows, recentTickets] = await Promise.all([
            Ticket.aggregate([
                { $match: filter },
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            Ticket.find(filter).sort({ updatedAt: -1 }).limit(5),
        ]);

        return sendSuccess(res, {
            status_counts: summaryRows.reduce(
                (accumulator, row) => ({ ...accumulator, [row._id]: row.count }),
                {}
            ),
            recent_tickets: recentTickets,
        });
    } catch (err) {
        next(err);
    }
};

const getHelpCenter = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'];
        const recentTickets = userId
            ? await Ticket.find({ userId }).sort({ updatedAt: -1 }).limit(5)
            : [];

        return sendSuccess(res, {
            ...HELP_CENTER,
            recent_tickets: recentTickets,
        });
    } catch (err) {
        next(err);
    }
};

const replyToTicket = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'];
        const role = req.headers['x-user-role'];
        const { message, attachments } = req.body;

        if (!message) return sendError(res, 'message is required', 400);

        const filter = ['admin', 'staff', 'super_admin'].includes(role)
            ? { _id: req.params.id }
            : { _id: req.params.id, userId };

        const ticket = await Ticket.findOneAndUpdate(
            filter,
            {
                $push: {
                    replies: {
                        authorId: userId,
                        authorRole: role || 'user',
                        message,
                        attachments: attachments || [],
                    },
                },
                $set: {
                    status: ['admin', 'staff', 'super_admin'].includes(role)
                        ? 'in_progress'
                        : 'open',
                },
            },
            { new: true }
        );

        if (!ticket) return sendError(res, 'Ticket not found', 404);

        // Emit reply event to ticket room and ticket owner
        const lastReply = ticket.replies[ticket.replies.length - 1];
        emitToTicket(String(ticket._id), 'ticket:reply', {
            ticketId: String(ticket._id),
            reply: lastReply,
        });
        emitToUser(ticket.userId, 'ticket:reply', {
            ticketId: String(ticket._id),
            reply: lastReply,
        });

        return sendSuccess(res, ticket, 'Reply added');
    } catch (err) {
        next(err);
    }
};

const assignTicket = async (req, res, next) => {
    try {
        const role = req.headers['x-user-role'];
        if (!['admin', 'staff', 'super_admin'].includes(role)) {
            return sendError(res, 'Forbidden', 403);
        }
        const ticket = await Ticket.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    assignedTo: req.body.assignedTo || '',
                    status: req.body.assignedTo ? 'in_progress' : 'open',
                },
            },
            { new: true }
        );
        if (!ticket) return sendError(res, 'Ticket not found', 404);
        if (req.body.assignedTo) {
            await emitInternalNotification({
                userId: req.body.assignedTo,
                title: 'Ticket assigned',
                message: `A support ticket has been assigned to you: ${ticket.subject}`,
                metadata: { ticketId: String(ticket._id) },
            });
        }
        return sendSuccess(res, ticket, 'Ticket assignment updated');
    } catch (err) {
        next(err);
    }
};

const updateTicketStatus = async (req, res, next) => {
    try {
        const role = req.headers['x-user-role'];
        if (!['admin', 'staff', 'super_admin'].includes(role)) {
            return sendError(res, 'Forbidden', 403);
        }
        const update = { status: req.body.status };
        if (req.body.status === 'resolved') update.resolvedAt = new Date();
        if (req.body.status === 'closed') update.closedAt = new Date();
        const ticket = await Ticket.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
        if (!ticket) return sendError(res, 'Ticket not found', 404);

        // Notify ticket owner about status change
        emitToUser(ticket.userId, 'ticket:statusUpdate', {
            ticketId: String(ticket._id),
            status: ticket.status,
        });
        emitToTicket(String(ticket._id), 'ticket:statusUpdate', {
            ticketId: String(ticket._id),
            status: ticket.status,
        });

        return sendSuccess(res, ticket, 'Ticket status updated');
    } catch (err) {
        next(err);
    }
};

const escalateTicket = async (req, res, next) => {
    try {
        const role = req.headers['x-user-role'];
        if (!['admin', 'staff', 'super_admin'].includes(role)) {
            return sendError(res, 'Forbidden', 403);
        }
        const ticket = await Ticket.findByIdAndUpdate(
            req.params.id,
            {
                $set: { priority: 'urgent', status: 'in_progress' },
                $push: {
                    replies: {
                        authorId: req.headers['x-user-id'],
                        authorRole: role,
                        message: req.body.message || 'Ticket escalated internally',
                        attachments: [],
                    },
                },
            },
            { new: true }
        );
        if (!ticket) return sendError(res, 'Ticket not found', 404);
        if (ticket.assignedTo) {
            await emitInternalNotification({
                userId: ticket.assignedTo,
                title: 'Ticket escalated',
                message: req.body.message || 'A ticket assigned to you was escalated.',
                metadata: { ticketId: String(ticket._id) },
            });
        }

        // Broadcast escalation event
        emitToRole('admin', 'ticket:escalated', {
            ticketId: String(ticket._id),
            subject: ticket.subject,
            priority: ticket.priority,
        });
        emitToUser(ticket.userId, 'ticket:escalated', {
            ticketId: String(ticket._id),
            subject: ticket.subject,
        });

        return sendSuccess(res, ticket, 'Ticket escalated');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createTicket,
    getTickets,
    getTicket,
    getTicketSummary,
    getHelpCenter,
    replyToTicket,
    assignTicket,
    updateTicketStatus,
    escalateTicket,
};
