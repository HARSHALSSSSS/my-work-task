const { Router } = require('express');
const controller = require('../controllers/auth.controller');
const validate = require('../../../../shared/middlewares/validate.middleware');
const {
    verifyTokenSchema,
    registerSchema,
    adminRegisterSchema,
    loginSchema,
    updateRoleSchema,
    setStatusSchema,
    sendPhoneOtpSchema,
    verifyPhoneOtpSchema,
} = require('../validators/auth.validator');
const { authenticate } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/admin.middleware');

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user with email/password
 *     description: |
 *       Create a new user account with email and password.
 *       Works independently of Firebase for testing purposes.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Full name of the user
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 128
 *                 description: Password for the account
 *               phone:
 *                 type: string
 *                 description: Phone number (optional)
 *               role:
 *                 type: string
 *                 enum: [user, vendor, delivery_partner]
 *                 default: user
 *                 description: User role
 *     responses:
 *       201:
 *         description: User registered successfully
 *       409:
 *         description: User already exists
 */
/**
 * @swagger
 * /register:
 *   post:
 *     summary: POST /register
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.post('/register', validate(registerSchema), controller.register);

/**
 * @swagger
 * /api/auth/google-verify:
 *   post:
 *     summary: Sign in / register via Google (user-app & delivery-app only)
 *     description: |
 *       Accepts a Google ID token from the Google Sign-In SDK (Android / iOS / Web).
 *       Verifies the token with Google and creates the account if new.
 *       **Only allowed for roles:** `user`, `delivery_partner`.
 *       Admins, vendors, and staff MUST use Firebase authentication.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Google ID token returned by the Google Sign-In SDK on the client
 *               role:
 *                 type: string
 *                 enum: [user, delivery_partner]
 *                 default: user
 *                 description: Requested role for new accounts (ignored for existing accounts)
 *     responses:
 *       200:
 *         description: Login successful — returning user
 *       201:
 *         description: New account created
 *       401:
 *         description: Invalid or expired Google token
 *       503:
 *         description: Google authentication not configured on this server
 */
router.post('/google-verify', controller.googleLogin);
router.post('/phone/send-otp', validate(sendPhoneOtpSchema), controller.sendPhoneOtp);
router.post('/phone/verify-otp', validate(verifyPhoneOtpSchema), controller.verifyPhoneOtp);

/**
 * @swagger
 * /api/auth/admin/register:
 *   post:
 *     summary: Register a new user with any role (admin only)
 *     description: |
 *       Create a new user account with email/password and any role.
 *       Admin-only endpoint for testing different user roles.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Full name of the user
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 128
 *                 description: Password for the account
 *               phone:
 *                 type: string
 *                 description: Phone number (optional)
 *               role:
 *                 type: string
 *                 enum: [user, vendor, admin, delivery_partner]
 *                 default: user
 *                 description: User role
 *     responses:
 *       201:
 *         description: User registered successfully
 *       401:
 *         description: Unauthorized (admin only)
 *       409:
 *         description: User already exists
 */
router.post(
    '/admin/register',
    authenticate,
    adminOnly,
    validate(adminRegisterSchema),
    controller.register
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email/password
 *     description: |
 *       Deprecated. Clients should authenticate with Firebase and call /api/auth/verify.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *               password:
 *                 type: string
 *                 description: User password
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
/**
 * @swagger
 * /login:
 *   post:
 *     summary: POST /login
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.post('/login', validate(loginSchema), controller.login);

/**
 * @swagger
 * /api/auth/verify:
 *   post:
 *     summary: Verify Firebase ID token and get profile
 *     description: |
 *       Client authenticates via Firebase (email/password, Google, phone OTP etc.),
 *       then sends the Firebase ID token here. We verify it and create/update the user
 *       profile in MongoDB. Subsequent API calls keep using the Firebase ID token.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Firebase ID token from client SDK
 *               role:
 *                 type: string
 *                 enum: [user, vendor, delivery_partner]
 *                 default: user
 *                 description: Requested role (only applied on first signup)
 *     responses:
 *       200:
 *         description: Login successful
 *       201:
 *         description: Account created
 *       401:
 *         description: Invalid Firebase token
 */
/**
 * @swagger
 * /verify:
 *   post:
 *     summary: POST /verify
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.post('/verify', validate(verifyTokenSchema), controller.verifyToken);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 */
router.get('/me', authenticate, controller.getMe);

/**
 * @swagger
 * /api/auth/users/{id}/role:
 *   patch:
 *     summary: Update user role (admin only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, vendor, admin, delivery_partner]
 *     responses:
 *       200:
 *         description: Role updated
 */
router.patch(
    '/users/:id/role',
    authenticate,
    adminOnly,
    validate(updateRoleSchema),
    controller.updateRole
);

/**
 * @swagger
 * /api/auth/users/{id}/status:
 *   patch:
 *     summary: Activate or deactivate a user (admin only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isActive]
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch(
    '/users/:id/status',
    authenticate,
    adminOnly,
    validate(setStatusSchema),
    controller.setUserStatus
);

module.exports = router;
