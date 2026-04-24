const express = require('express');
const { getStaffDashboard } = require('../controllers/staff.controller');
const staffApiController = require('../controllers/staff-api.controller');
const { adminOnly } = require('../middlewares/admin.middleware');
const { attachmentUpload } = require('../config/upload');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Staff Auth
 *     description: Staff authentication and session control
 *   - name: Staff RBAC
 *     description: Role-based access control for staff
 *   - name: Staff Tasks
 *     description: Staff task execution and workflow
 *   - name: Staff Ops
 *     description: Order execution and management
 *   - name: Staff Support
 *     description: Customer and vendor support tickets
 *   - name: Staff Finance
 *     description: Refunds, wallets, and payouts
 *   - name: Staff Marketing
 *     description: Campaigns, coupons, and targeting
 *   - name: Staff Escalation
 *     description: Escalation and governance
 *   - name: Staff Audit
 *     description: Audit logs and activity tracking
 *   - name: Staff System
 *     description: System status and edge cases
 */

// =========================================================
// 1. DASHBOARD API
// =========================================================

/**
 * @swagger
 * /api/staff/dashboard:
 *   get:
 *     summary: Get staff dashboard data
 *     tags: [Staff Dashboard]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [ops, support, finance, marketing]
 *         description: Staff role for dashboard customization
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 */
router.get('/dashboard', getStaffDashboard);

// =========================================================
// 2. AUTH & SESSION APIs
// =========================================================

/**
 * @swagger
 * /api/staff/auth/login:
 *   post:
 *     summary: Email + Password login
 *     tags: [Staff Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/auth/login', staffApiController.login);

/**
 * @swagger
 * /api/staff/auth/mfa/verify:
 *   post:
 *     summary: MFA verification
 *     tags: [Staff Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string }
 *     responses:
 *       200:
 *         description: MFA verified
 */
router.post('/auth/mfa/verify', staffApiController.verifyMfa);

/**
 * @swagger
 * /api/staff/auth/logout:
 *   post:
 *     summary: Logout
 *     tags: [Staff Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/auth/logout', staffApiController.logout);

/**
 * @swagger
 * /api/staff/auth/session:
 *   get:
 *     summary: Current session details
 *     tags: [Staff Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Session details retrieved
 */
router.get('/auth/session', staffApiController.getSession);

/**
 * @swagger
 * /api/staff/auth/sessions:
 *   get:
 *     summary: Active sessions list
 *     tags: [Staff Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active sessions
 */
router.get('/auth/sessions', staffApiController.getSessions);

/**
 * @swagger
 * /api/staff/auth/session/{id}:
 *   delete:
 *     summary: Kill session
 *     tags: [Staff Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Session killed
 */
router.delete('/auth/session/:id', staffApiController.killSession);


// =========================================================
// 2. RBAC (ROLE BASED ACCESS CONTROL)
// =========================================================

/**
 * @swagger
 * /api/staff/roles/{userId}:
 *   get:
 *     summary: User role fetch
 *     tags: [Staff RBAC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User role details
 */
router.get('/roles/:userId', staffApiController.getUserRole);

/**
 * @swagger
 * /api/staff/permissions/{role}:
 *   get:
 *     summary: Permissions list
 *     tags: [Staff RBAC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Permissions list retrieved
 */
router.get('/permissions/:role', staffApiController.getPermissions);

/**
 * @swagger
 * /api/staff/roles/assign:
 *   post:
 *     summary: Assign role
 *     tags: [Staff RBAC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, role]
 *             properties:
 *               userId: { type: string }
 *               role: { type: string }
 *     responses:
 *       200:
 *         description: Role assigned successfully
 */
router.post('/roles/assign', adminOnly, staffApiController.assignRole);


// =========================================================
// 4. TASK ENGINE APIs
// =========================================================

/**
 * @swagger
 * /api/staff/tasks:
 *   get:
 *     summary: Fetch tasks
 *     tags: [Staff Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of tasks
 */
router.get('/tasks', staffApiController.getTasks);

/**
 * @swagger
 * /api/staff/tasks/{id}:
 *   get:
 *     summary: Task detail
 *     tags: [Staff Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Task details retrieved
 */
router.get('/tasks/:id', staffApiController.getTaskDetail);

/**
 * @swagger
 * /api/staff/tasks/{id}/complete:
 *   post:
 *     summary: Complete task
 *     tags: [Staff Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Task completed successfully
 */
router.post('/tasks/:id/complete', staffApiController.completeTask);

/**
 * @swagger
 * /api/staff/tasks/{id}/assign:
 *   post:
 *     summary: Assign task
 *     tags: [Staff Tasks]
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
 *             required: [assigneeId]
 *             properties:
 *               assigneeId: { type: string }
 *     responses:
 *       200:
 *         description: Task assigned successfully
 */
router.post('/tasks/:id/assign', staffApiController.assignTask);


// =========================================================
// 5. OPS (ORDER MANAGEMENT) APIs
// =========================================================

/**
 * @swagger
 * /api/staff/vendors:
 *   get:
 *     summary: Get assignable vendors for ops actions
 *     tags: [Staff Ops]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Assignable vendors retrieved
 */
router.get('/vendors', staffApiController.getAssignableVendors);

/**
 * @swagger
 * /api/staff/orders:
 *   get:
 *     summary: Order queue
 *     tags: [Staff Ops]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order queue retrieved
 */
router.get('/orders', staffApiController.getOrdersQueue);

/**
 * @swagger
 * /api/staff/orders/{id}:
 *   get:
 *     summary: Order detail
 *     tags: [Staff Ops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order details retrieved
 */
router.get('/orders/:id', staffApiController.getOrderDetail);

/**
 * @swagger
 * /api/staff/orders/{id}/reassign-vendor:
 *   post:
 *     summary: Change vendor
 *     tags: [Staff Ops]
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
 *             required: [newVendorId, reason]
 *             properties:
 *               newVendorId: { type: string }
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Vendor reassigned
 */
router.post('/orders/:id/reassign-vendor', staffApiController.reassignVendor);

/**
 * @swagger
 * /api/staff/orders/{id}/clarification:
 *   post:
 *     summary: Raise clarification
 *     tags: [Staff Ops]
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
 *         description: Clarification raised
 */
router.post('/orders/:id/clarification', staffApiController.raiseClarification);


// =========================================================
// 6. SUPPORT APIs (CUSTOMER + VENDOR)
// =========================================================

/**
 * @swagger
 * /api/staff/tickets:
 *   get:
 *     summary: Get customer tickets
 *     tags: [Staff Support]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer tickets retrieved
 */
router.get('/tickets', staffApiController.getTickets);

/**
 * @swagger
 * /api/staff/tickets/{id}:
 *   get:
 *     summary: Get ticket detail
 *     tags: [Staff Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Ticket details retrieved
 */
router.get('/tickets/:id', staffApiController.getTicketDetail);

/**
 * @swagger
 * /api/staff/tickets/{id}/reply:
 *   post:
 *     summary: Reply to ticket
 *     tags: [Staff Support]
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
 *         description: Reply sent
 */
router.post('/tickets/:id/reply', staffApiController.replyTicket);

/**
 * @swagger
 * /api/staff/tickets/{id}/close:
 *   post:
 *     summary: Close ticket
 *     tags: [Staff Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Ticket closed
 */
router.post('/tickets/:id/close', staffApiController.closeTicket);

/**
 * @swagger
 * /api/staff/tickets/{id}/escalate:
 *   post:
 *     summary: Escalate ticket
 *     tags: [Staff Support]
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
 *             required: [reason]
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Ticket escalated
 */
router.post('/tickets/:id/escalate', staffApiController.escalateTicket);

/**
 * @swagger
 * /api/staff/vendor-tickets:
 *   get:
 *     summary: Get vendor tickets
 *     tags: [Staff Support]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vendor tickets retrieved
 */
router.get('/vendor-tickets', staffApiController.getVendorTickets);

/**
 * @swagger
 * /api/staff/vendor-tickets/{id}/reply:
 *   post:
 *     summary: Reply to vendor ticket
 *     tags: [Staff Support]
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
 *         description: Reply sent to vendor ticket
 */
router.post('/vendor-tickets/:id/reply', staffApiController.replyVendorTicket);
router.post('/uploads/attachments', attachmentUpload.array('attachments', 10), staffApiController.uploadAttachments);


// =========================================================
// 7. FINANCE APIs
// =========================================================

/**
 * @swagger
 * /api/staff/refunds:
 *   get:
 *     summary: Get refunds
 *     tags: [Staff Finance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of refunds
 */
router.get('/refunds', staffApiController.getRefunds);

/**
 * @swagger
 * /api/staff/refunds/{id}/approve:
 *   post:
 *     summary: Approve refund
 *     tags: [Staff Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Refund approved
 */
router.post('/refunds/:id/approve', staffApiController.approveRefund);

/**
 * @swagger
 * /api/staff/refunds/{id}/escalate:
 *   post:
 *     summary: Escalate refund
 *     tags: [Staff Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Refund escalated
 */
router.post('/refunds/:id/escalate', staffApiController.escalateRefund);

/**
 * @swagger
 * /api/staff/wallet/credit:
 *   post:
 *     summary: Credit wallet
 *     tags: [Staff Finance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, amount]
 *             properties:
 *               userId: { type: string }
 *               amount: { type: number }
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Wallet credited
 */
router.post('/wallet/credit', staffApiController.creditWallet);

/**
 * @swagger
 * /api/staff/wallet/debit:
 *   post:
 *     summary: Debit wallet
 *     tags: [Staff Finance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, amount]
 *             properties:
 *               userId: { type: string }
 *               amount: { type: number }
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Wallet debited
 */
router.post('/wallet/debit', staffApiController.debitWallet);

/**
 * @swagger
 * /api/staff/wallet/ledger:
 *   get:
 *     summary: Get wallet ledger
 *     tags: [Staff Finance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet ledger retrieved
 */
router.get('/wallet/ledger', staffApiController.getWalletLedger);

/**
 * @swagger
 * /api/staff/payouts:
 *   get:
 *     summary: Get vendor payouts
 *     tags: [Staff Finance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vendor payouts retrieved
 */
router.get('/payouts', staffApiController.getPayouts);

/**
 * @swagger
 * /api/staff/payouts/issue-ticket:
 *   post:
 *     summary: Issue payout ticket
 *     tags: [Staff Finance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [payoutId, issueDetails]
 *             properties:
 *               payoutId: { type: string }
 *               issueDetails: { type: string }
 *     responses:
 *       200:
 *         description: Ticket issued successfully
 */
router.post('/payouts/issue-ticket', staffApiController.issuePayoutTicket);


// =========================================================
// 8. MARKETING APIs
// =========================================================

/**
 * @swagger
 * /api/staff/campaigns:
 *   get:
 *     summary: Get campaigns
 *     tags: [Staff Marketing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Campaigns retrieved
 */
router.get('/campaigns', staffApiController.getCampaigns);

/**
 * @swagger
 * /api/staff/coupons:
 *   post:
 *     summary: Create coupon
 *     tags: [Staff Marketing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, discount]
 *             properties:
 *               code: { type: string }
 *               discount: { type: number }
 *     responses:
 *       201:
 *         description: Coupon created
 */
router.post('/coupons', staffApiController.createCoupon);

/**
 * @swagger
 * /api/staff/targeting:
 *   post:
 *     summary: Target users
 *     tags: [Staff Marketing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [segment, action]
 *             properties:
 *               segment: { type: string }
 *               action: { type: string }
 *     responses:
 *       200:
 *         description: Targeting action created
 */
router.post('/targeting', staffApiController.createTargeting);

/**
 * @swagger
 * /api/staff/analytics/reports:
 *   get:
 *     summary: Get analytics reports
 *     tags: [Staff Marketing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics reports retrieved
 */
router.get('/analytics/reports', staffApiController.getAnalyticsReports);


// =========================================================
// 9. ESCALATION APIs
// =========================================================

/**
 * @swagger
 * /api/staff/escalation:
 *   post:
 *     summary: Trigger escalation
 *     tags: [Staff Escalation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [entityId, type, reason]
 *             properties:
 *               entityId: { type: string }
 *               type: { type: string }
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Escalation triggered
 */
router.post('/escalation', staffApiController.triggerEscalation);

/**
 * @swagger
 * /api/staff/escalations:
 *   get:
 *     summary: Get escalations
 *     tags: [Staff Escalation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of escalations
 */
router.get('/escalations', staffApiController.getEscalations);


// =========================================================
// 10. AUDIT & LOGGING APIs
// =========================================================

/**
 * @swagger
 * /api/staff/audit/logs:
 *   get:
 *     summary: Get audit logs
 *     tags: [Staff Audit]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Audit logs retrieved
 */
router.get('/audit/logs', staffApiController.getAuditLogs);

/**
 * @swagger
 * /api/staff/activity:
 *   get:
 *     summary: Get activity logs
 *     tags: [Staff Audit]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Activity logs retrieved
 */
router.get('/activity', staffApiController.getActivity);

/**
 * @swagger
 * /api/staff/performance:
 *   get:
 *     summary: Get performance metrics
 *     tags: [Staff Audit]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Performance metrics retrieved
 */
router.get('/performance', staffApiController.getPerformance);


// =========================================================
// 11. SYSTEM / FAILURE APIs
// =========================================================

/**
 * @swagger
 * /api/staff/system/status:
 *   get:
 *     summary: Get system status
 *     tags: [Staff System]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System status retrieved
 */
router.get('/system/status', staffApiController.getSystemStatus);

/**
 * @swagger
 * /api/staff/permissions/check:
 *   get:
 *     summary: Check permissions
 *     tags: [Staff System]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Permission check result
 */
router.get('/permissions/check', staffApiController.checkPermissions);

/**
 * @swagger
 * /api/staff/conflict/lock:
 *   post:
 *     summary: Enforce conflict lock
 *     tags: [Staff System]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [resourceId, lockType]
 *             properties:
 *               resourceId: { type: string }
 *               lockType: { type: string }
 *     responses:
 *       200:
 *         description: Lock applied
 */
router.post('/conflict/lock', staffApiController.conflictLock);

module.exports = router;
