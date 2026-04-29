const { Router } = require('express');
const controller = require('../controllers/notification.controller');
const ticketController = require('../controllers/ticket.controller');

const router = Router();

const internalAuth = (req, res, next) => {
    const token = req.headers['x-internal-token'];
    const expected = process.env.INTERNAL_SERVICE_TOKEN || 'speedcopy-internal-dev-token';
    if (token !== expected)
        return res.status(401).json({ success: false, message: 'Invalid internal token' });
    next();
};

/**
 * @swagger
 * tags:
 *   - name: Notifications
 *     description: In-app notifications
 *   - name: Tickets
 *     description: Customer support tickets
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get user notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isRead
 *         schema: { type: boolean }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated notifications
 */
/**
 * @swagger
 * /:
 *   get:
 *     summary: GET /
 *     tags: [Notification]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/', controller.getNotifications);

/**
 * @swagger
 * /api/notifications/summary:
 *   get:
 *     summary: Get notifications summary (unread count, etc)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications summary
 */
router.get('/summary', controller.getSummary);

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All marked as read
 */
router.patch('/read-all', controller.markAllRead);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Marked as read
 */
router.patch('/:id/read', controller.markRead);

/**
 * @swagger
 * /api/notifications/internal:
 *   post:
 *     summary: Create notification (internal service-to-service only)
 *     tags: [Notifications]
 *     parameters:
 *       - in: header
 *         name: x-internal-token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201:
 *         description: Notification created
 */
router.post('/internal', internalAuth, controller.createNotification);

/**
 * @swagger
 * /api/notifications/tickets:
 *   post:
 *     summary: Create a support ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subject, description]
 *             properties:
 *               subject: { type: string }
 *               description: { type: string }
 *               category:
 *                 type: string
 *                 enum: [order_issue, payment_issue, delivery_issue, product_issue, account_issue, other]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *               orderId: { type: string }
 *     responses:
 *       201:
 *         description: Ticket created
 *   get:
 *     summary: Get tickets (own tickets for customers, all for admin/staff)
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [open, in_progress, resolved, closed] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Paginated tickets
 */
/**
 * @swagger
 * /tickets:
 *   post:
 *     summary: POST /tickets
 *     tags: [Notification]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.post('/tickets', ticketController.createTicket);
router.get('/tickets', ticketController.getTickets);

/**
 * @swagger
 * /api/notifications/tickets/summary:
 *   get:
 *     summary: Get tickets summary (open count, stats)
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tickets summary
 */
router.get('/tickets/summary', ticketController.getTicketSummary);

/**
 * @swagger
 * /api/notifications/help-center:
 *   get:
 *     summary: Get help center articles and FAQs
 *     tags: [Tickets]
 *     responses:
 *       200:
 *         description: Help center content
 */
router.get('/help-center', ticketController.getHelpCenter);

/**
 * @swagger
 * /api/notifications/tickets/{id}:
 *   get:
 *     summary: Get ticket by ID
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Ticket details with replies
 */
router.get('/tickets/:id', ticketController.getTicket);

/**
 * @swagger
 * /api/notifications/tickets/{id}/assign:
 *   patch:
 *     summary: Assign a ticket to a staff member
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ticket assigned
 */
router.patch('/tickets/:id/assign', ticketController.assignTicket);

/**
 * @swagger
 * /api/notifications/tickets/{id}/status:
 *   patch:
 *     summary: Update ticket status
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ticket status updated
 */
router.patch('/tickets/:id/status', ticketController.updateTicketStatus);

/**
 * @swagger
 * /api/notifications/tickets/{id}/escalate:
 *   post:
 *     summary: Escalate a ticket internally
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ticket escalated
 */
router.post('/tickets/:id/escalate', ticketController.escalateTicket);

/**
 * @swagger
 * /api/notifications/tickets/{id}/reply:
 *   post:
 *     summary: Reply to a ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message: { type: string }
 *     responses:
 *       200:
 *         description: Reply added
 */
/**
 * @swagger
 * /tickets/{id}/reply:
 *   post:
 *     summary: POST /tickets/{id}/reply
 *     tags: [Notification]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.post('/tickets/:id/reply', ticketController.replyToTicket);

module.exports = router;
