const { Router } = require('express');
const c = require('../controllers/vendor.controller');
const orderController = require('../controllers/order.controller');
const { vendorOnly } = require('../middlewares/vendor.middleware');

const router = Router();

// Public routes (no authentication required)
/**
 * @swagger
 * /stores/nearby:
 *   get:
 *     summary: GET /stores/nearby
 *     tags: [Vendor]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/stores/nearby', c.getNearbyStores);

// Protected routes (vendor authentication required)
/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Vendor authentication
 *   - name: Finance
 *     description: Vendor finance and payouts
 *   - name: Scoring
 *     description: Vendor scoring and rejections
 *   - name: Support
 *     description: Vendor support tickets
 *   - name: Legal
 *     description: Vendor legal documentation
 *   - name: Org
 *     description: Vendor organization profile
 *   - name: Stores
 *     description: Vendor store management
 *   - name: Staff
 *     description: Vendor staff management
 *   - name: Analytics
 *     description: Vendor analytics
 */

const authController = require('../controllers/auth.controller');
const financeController = require('../controllers/finance.controller');
const scoringController = require('../controllers/scoring.controller');
const supportController = require('../controllers/support.controller');
const legalController = require('../controllers/legal.controller');
const { legalUpload, qcUpload } = require('../config/upload');

/**
 * @swagger
 * /api/vendor/auth/login:
 *   post:
 *     summary: Vendor login
 *     tags: [Auth]
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
router.post('/auth/login', authController.login);

/**
 * @swagger
 * /api/vendor/auth/mfa/verify:
 *   post:
 *     summary: Verify MFA OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [otp]
 *             properties:
 *               otp: { type: string }
 *     responses:
 *       200:
 *         description: MFA verified
 */
router.post('/auth/mfa/verify', authController.verifyMfa);

/**
 * @swagger
 * /api/vendor/auth/logout:
 *   post:
 *     summary: Vendor logout
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/auth/logout', vendorOnly, authController.logout);

/**
 * @swagger
 * /api/vendor/auth/session:
 *   get:
 *     summary: Get vendor session
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vendor session data
 */
router.get('/auth/session', vendorOnly, authController.getSession);

/**
 * @swagger
 * /api/vendor/org/profile:
 *   get:
 *     summary: Get vendor org profile
 *     tags: [Org]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Org profile
 *   put:
 *     summary: Update vendor org profile
 *     tags: [Org]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               businessName: { type: string }
 *               gstNumber: { type: string }
 *               contactName: { type: string }
 *               contactEmail: { type: string }
 *               contactPhone: { type: string }
 *     responses:
 *       200:
 *         description: Profile updated
 */
/**
 * @swagger
 * /org/profile:
 *   get:
 *     summary: GET /org/profile
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/org/profile', vendorOnly, c.getProfile);
router.put('/org/profile', vendorOnly, c.updateProfile);

/**
 * @swagger
 * /api/vendor/org/legal:
 *   get:
 *     summary: Get legal documentation status
 *     tags: [Legal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Legal documents
 *   post:
 *     summary: Upload legal documents
 *     tags: [Legal]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               gstNumber: { type: string }
 *               panNumber: { type: string }
 *               companyRegistrationNumber: { type: string }
 *     responses:
 *       200:
 *         description: Documents submitted
 */
/**
 * @swagger
 * /org/legal:
 *   get:
 *     summary: GET /org/legal
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/org/legal', vendorOnly, legalController.getLegalDocs);
router.post(
    '/org/legal',
    vendorOnly,
    legalUpload.fields([
        { name: 'gstCertificate', maxCount: 1 },
        { name: 'panCard', maxCount: 1 },
        { name: 'companyRegistrationCertificate', maxCount: 1 },
    ]),
    legalController.uploadLegalDocs
);

/**
 * @swagger
 * /api/vendor/org/agreement:
 *   get:
 *     summary: Get vendor agreement status
 *     tags: [Legal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Agreement status
 */
router.get('/org/agreement', vendorOnly, legalController.getAgreement);

/**
 * @swagger
 * /api/vendor/stores:
 *   get:
 *     summary: Get all stores
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of stores
 *   post:
 *     summary: Create a store
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, address]
 *             properties:
 *               name: { type: string }
 *               address:
 *                 type: object
 *                 properties:
 *                   line1: { type: string }
 *                   city: { type: string }
 *                   state: { type: string }
 *                   pincode: { type: string }
 *               phone: { type: string }
 *               workingHours: { type: string }
 *               supportedFlows:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [printing, gifting, shopping]
 *     responses:
 *       201:
 *         description: Store created
 */
/**
 * @swagger
 * /stores:
 *   get:
 *     summary: GET /stores
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/stores', vendorOnly, c.getStores);
router.post('/stores', vendorOnly, c.createStore);

/**
 * @swagger
 * /api/vendor/stores/{id}:
 *   get:
 *     summary: Get store by ID
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Store details
 *   put:
 *     summary: Update store
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Store updated
 */
/**
 * @swagger
 * /stores/{id}:
 *   get:
 *     summary: GET /stores/{id}
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/stores/:id', vendorOnly, c.getStore);
router.put('/stores/:id', vendorOnly, c.updateStore);

/**
 * @swagger
 * /api/vendor/stores/{id}/status:
 *   patch:
 *     summary: Activate or deactivate store
 *     tags: [Stores]
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
 *             properties:
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Status updated
 */
/**
 * @swagger
 * /stores/{id}/status:
 *   patch:
 *     summary: PATCH /stores/{id}/status
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.patch('/stores/:id/status', vendorOnly, c.updateStoreStatus);

/**
 * @swagger
 * /api/vendor/stores/{id}/capacity:
 *   put:
 *     summary: Update store capacity
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maxOrdersPerDay: { type: integer }
 *               currentLoad: { type: integer }
 *     responses:
 *       200:
 *         description: Capacity updated
 */
/**
 * @swagger
 * /stores/{id}/capacity:
 *   put:
 *     summary: PUT /stores/{id}/capacity
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.put('/stores/:id/capacity', vendorOnly, c.updateStoreCapacity);

/**
 * @swagger
 * /api/vendor/stores/{id}/availability:
 *   patch:
 *     summary: Toggle store availability
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isAvailable: { type: boolean }
 *     responses:
 *       200:
 *         description: Availability updated
 */
/**
 * @swagger
 * /stores/{id}/availability:
 *   patch:
 *     summary: PATCH /stores/{id}/availability
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.patch('/stores/:id/availability', vendorOnly, c.updateStoreAvailability);

/**
 * @swagger
 * /api/vendor/stores/{id}/capabilities:
 *   get:
 *     summary: Get store capabilities
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Store capabilities
 */
router.get('/stores/:id/capabilities', vendorOnly, c.getStoreCapabilities);

/**
 * @swagger
 * /api/vendor/staff:
 *   get:
 *     summary: Get all staff members
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Staff list
 *   post:
 *     summary: Add staff member
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               role:
 *                 type: string
 *                 enum: [manager, operator, qc]
 *               storeId: { type: string }
 *     responses:
 *       201:
 *         description: Staff added
 */
/**
 * @swagger
 * /staff:
 *   get:
 *     summary: GET /staff
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/staff', vendorOnly, c.getStaff);
router.post('/staff', vendorOnly, c.createStaff);

/**
 * @swagger
 * /api/vendor/staff/{id}:
 *   put:
 *     summary: Update staff member
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Staff updated
 */
router.put('/staff/:id', vendorOnly, c.updateStaff);

/**
 * @swagger
 * /api/vendor/staff/{id}/assign-stores:
 *   patch:
 *     summary: Assign one or more stores to a staff member
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stores assigned to staff member
 */
router.patch('/staff/:id/assign-stores', vendorOnly, c.assignStaffStores);

/**
 * @swagger
 * /api/vendor/staff/{id}/status:
 *   patch:
 *     summary: Activate or deactivate staff member
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Status updated
 */
/**
 * @swagger
 * /staff/{id}/status:
 *   patch:
 *     summary: PATCH /staff/{id}/status
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.patch('/staff/:id/status', vendorOnly, c.updateStaffStatus);

// ═══════════════════════════════════════════════════════════
// Order Management & Production (7 endpoints)
// ═══════════════════════════════════════════════════════════

/**
 * @swagger
 * /orders/assigned:
 *   get:
 *     summary: GET /orders/assigned
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/orders/assigned', vendorOnly, orderController.getAssigned);

/**
 * @swagger
 * /orders/{order_id}:
 *   get:
 *     summary: GET /orders/{order_id}
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: order_id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/orders/:order_id', vendorOnly, orderController.getVendorOrder);

/**
 * @swagger
 * /orders/{order_id}/accept:
 *   post:
 *     summary: POST /orders/{order_id}/accept
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: order_id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.post('/orders/:order_id/accept', vendorOnly, orderController.acceptOrder);

/**
 * @swagger
 * /orders/{order_id}/reject:
 *   post:
 *     summary: POST /orders/{order_id}/reject
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: order_id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.post('/orders/:order_id/reject', vendorOnly, orderController.rejectOrder);

/**
 * @swagger
 * /orders/{order_id}/status:
 *   post:
 *     summary: POST /orders/{order_id}/status
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: order_id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string }
 *               note: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.post('/orders/:order_id/status', vendorOnly, orderController.updateStatus);

/**
 * @swagger
 * /orders/{order_id}/qc-upload:
 *   post:
 *     summary: POST /orders/{order_id}/qc-upload
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: order_id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [images]
 *             properties:
 *               images:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.post(
    '/orders/:order_id/qc-upload',
    vendorOnly,
    qcUpload.array('images', 5),
    orderController.qcUpload
);

/**
 * @swagger
 * /orders/{order_id}/ready:
 *   post:
 *     summary: POST /orders/{order_id}/ready
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: order_id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.post('/orders/:order_id/ready', vendorOnly, orderController.markReady);

/**
 * @swagger
 * /api/vendor/analytics/performance:
 *   get:
 *     summary: Get vendor performance analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Performance stats
 */
router.get('/analytics/performance', vendorOnly, c.getPerformance);

/**
 * @swagger
 * /api/vendor/finance/wallet/summary:
 *   get:
 *     summary: Get wallet summary
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet summary
 */
router.get('/finance/wallet/summary', vendorOnly, financeController.getWalletSummary);
router.get('/wallet/summary', vendorOnly, financeController.getWalletSummary);

/**
 * @swagger
 * /api/vendor/finance/wallet/store-wise:
 *   get:
 *     summary: Get store-wise earnings
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Store-wise earnings
 */
router.get('/finance/wallet/store-wise', vendorOnly, financeController.getWalletStoreWise);
router.get('/wallet/store-wise', vendorOnly, financeController.getWalletStoreWise);

/**
 * @swagger
 * /api/vendor/finance/wallet/deductions:
 *   get:
 *     summary: Get deductions
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Deductions list
 */
router.get('/finance/wallet/deductions', vendorOnly, financeController.getWalletDeductions);
router.get('/wallet/deductions', vendorOnly, financeController.getWalletDeductions);

/**
 * @swagger
 * /api/vendor/finance/closure/daily:
 *   get:
 *     summary: Get daily closure
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daily closure
 */
router.get('/finance/closure/daily', vendorOnly, financeController.getClosureDaily);
router.get('/closure/daily', vendorOnly, financeController.getClosureDaily);

/**
 * @swagger
 * /api/vendor/finance/closure/weekly:
 *   get:
 *     summary: Get weekly closure
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Weekly closure
 */
router.get('/finance/closure/weekly', vendorOnly, financeController.getClosureWeekly);
router.get('/closure/weekly', vendorOnly, financeController.getClosureWeekly);

/**
 * @swagger
 * /api/vendor/finance/closure/monthly:
 *   get:
 *     summary: Get monthly closure
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Monthly closure
 */
router.get('/finance/closure/monthly', vendorOnly, financeController.getClosureMonthly);
router.get('/closure/monthly', vendorOnly, financeController.getClosureMonthly);

/**
 * @swagger
 * /api/vendor/finance/payouts/schedule:
 *   get:
 *     summary: Get payouts schedule
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payouts schedule
 */
router.get('/finance/payouts/schedule', vendorOnly, financeController.getPayoutsSchedule);
router.get('/payouts/schedule', vendorOnly, financeController.getPayoutsSchedule);

/**
 * @swagger
 * /api/vendor/finance/payouts/history:
 *   get:
 *     summary: Get payouts history
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payouts history
 */
router.get('/finance/payouts/history', vendorOnly, financeController.getPayoutsHistory);
router.get('/payouts/history', vendorOnly, financeController.getPayoutsHistory);

/**
 * @swagger
 * /api/vendor/scoring/rejections/history:
 *   get:
 *     summary: Get rejections history
 *     tags: [Scoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rejections history
 */
router.get('/scoring/rejections/history', vendorOnly, scoringController.getRejectionsHistory);
router.get('/rejections/history', vendorOnly, scoringController.getRejectionsHistory);

/**
 * @swagger
 * /api/vendor/scoring/performance-score:
 *   get:
 *     summary: Get vendor performance score
 *     tags: [Scoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vendor score
 */
router.get('/scoring/performance-score', vendorOnly, scoringController.getPerformanceScore);
router.get('/vendor/performance-score', vendorOnly, scoringController.getPerformanceScore);
router.get('/performance-score', vendorOnly, scoringController.getPerformanceScore);

/**
 * @swagger
 * /api/vendor/support/tickets:
 *   get:
 *     summary: Get support tickets
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Support tickets
 *   post:
 *     summary: Create support ticket
 *     tags: [Support]
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
 *               category: { type: string }
 *               description: { type: string }
 *               orderId: { type: string }
 *     responses:
 *       201:
 *         description: Support ticket created
 */
/**
 * @swagger
 * /support/tickets:
 *   get:
 *     summary: GET /support/tickets
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/support/tickets', vendorOnly, supportController.getTickets);
router.post('/support/tickets', vendorOnly, supportController.createTicket);
router.get('/tickets', vendorOnly, supportController.getTickets);
router.post('/tickets', vendorOnly, supportController.createTicket);
router.get('/support/tickets/summary', vendorOnly, supportController.getSummary);
router.get('/tickets/summary', vendorOnly, supportController.getSummary);
router.get('/support/tickets/:ticket_id', vendorOnly, supportController.getTicket);
router.get('/tickets/:ticket_id', vendorOnly, supportController.getTicket);
router.post('/support/tickets/:ticket_id/reply', vendorOnly, supportController.replyTicket);
router.post('/tickets/:ticket_id/reply', vendorOnly, supportController.replyTicket);

router.get('/vendor-org/legal', vendorOnly, legalController.getLegalDocs);
router.post(
    '/vendor-org/legal',
    vendorOnly,
    legalUpload.fields([
        { name: 'gstCertificate', maxCount: 1 },
        { name: 'panCard', maxCount: 1 },
        { name: 'companyRegistrationCertificate', maxCount: 1 },
    ]),
    legalController.uploadLegalDocs
);
router.get('/vendor-org/agreement', vendorOnly, legalController.getAgreement);

module.exports = router;
