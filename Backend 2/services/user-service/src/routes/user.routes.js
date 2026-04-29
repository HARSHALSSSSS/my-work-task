const { Router } = require('express');
const controller = require('../controllers/user.controller');
const validate = require('../../../../shared/middlewares/validate.middleware');
const {
    updateProfileSchema,
    addressSchema,
    addressLocationSchema,
    notificationPreferencesSchema,
    privacyRequestSchema,
} = require('../validators/user.validator');
const { avatarUpload } = require('../config/upload');

const router = Router();

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 */
router.get('/profile', controller.getProfile);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put('/profile', validate(updateProfileSchema), controller.updateProfile);

/**
 * @swagger
 * /api/users/profile/avatar:
 *   post:
 *     summary: Upload user profile avatar
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [avatar]
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Avatar image file
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 *       400:
 *         description: Invalid file format or size
 */
router.post('/profile/avatar', avatarUpload.single('avatar'), controller.uploadAvatar);

/**
 * @swagger
 * /api/users/profile/notifications:
 *   patch:
 *     summary: Update notification preferences
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification preferences updated
 */
router.patch(
    '/profile/notifications',
    validate(notificationPreferencesSchema),
    controller.updateNotificationPreferences
);

/**
 * @swagger
 * /api/users/profile/data-export-request:
 *   post:
 *     summary: Request personal data export
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       202:
 *         description: Data export request recorded
 */
router.post(
    '/profile/data-export-request',
    validate(privacyRequestSchema),
    controller.requestDataExport
);

/**
 * @swagger
 * /api/users/profile/account-deletion-request:
 *   post:
 *     summary: Request account deletion
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       202:
 *         description: Account deletion request recorded or blocked when active orders exist
 */
router.post(
    '/profile/account-deletion-request',
    validate(privacyRequestSchema),
    controller.requestAccountDeletion
);

/**
 * @swagger
 * /api/users/addresses:
 *   get:
 *     summary: Get all user addresses
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user addresses
 */
router.get('/addresses', controller.getAddresses);

/**
 * @swagger
 * /api/users/addresses:
 *   post:
 *     summary: Add a new address
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, phone, line1, city, state, pincode]
 *             properties:
 *               fullName:
 *                 type: string
 *               phone:
 *                 type: string
 *               line1:
 *                 type: string
 *               line2:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               pincode:
 *                 type: string
 *               country:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Address added successfully
 */
router.post('/addresses', validate(addressSchema), controller.addAddress);

/**
 * @swagger
 * /api/users/addresses/{id}:
 *   put:
 *     summary: Update an existing address
 *     tags: [Users]
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
 *               fullName:
 *                 type: string
 *               phone:
 *                 type: string
 *               line1:
 *                 type: string
 *               line2:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               pincode:
 *                 type: string
 *               country:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Address updated successfully
 */
router.put(
    '/addresses/:id',
    validate(
        addressSchema.fork(['fullName', 'phone', 'line1', 'city', 'state', 'pincode'], (f) =>
            f.optional()
        )
    ),
    controller.updateAddress
);

/**
 * @swagger
 * /api/users/addresses/{id}/location:
 *   patch:
 *     summary: Update exact GPS location for an existing address
 *     tags: [Users]
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
 *             required: [location]
 *             properties:
 *               location:
 *                 type: object
 *                 required: [lat, lng]
 *                 properties:
 *                   lat: { type: number }
 *                   lng: { type: number }
 *                   accuracyMeters: { type: number }
 *                   source: { type: string }
 *                   capturedAt: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Address location updated successfully
 */
router.patch('/addresses/:id/location', validate(addressLocationSchema), controller.updateAddressLocation);

/**
 * @swagger
 * /addresses/{id}:
 *   delete:
 *     summary: DELETE /addresses/{id}
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.delete('/addresses/:id', controller.deleteAddress);

/**
 * @swagger
 * /api/users/wishlist:
 *   get:
 *     summary: Get user wishlist
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of wishlist items
 */
router.get('/wishlist', controller.getWishlist);

/**
 * @swagger
 * /api/users/wishlist:
 *   post:
 *     summary: Add product to wishlist
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId]
 *             properties:
 *               productId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Product added to wishlist
 */
router.post('/wishlist', controller.addToWishlist);

/**
 * @swagger
 * /api/users/wishlist:
 *   delete:
 *     summary: Clear entire wishlist
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wishlist cleared
 */
router.delete('/wishlist', controller.clearWishlist);

/**
 * @swagger
 * /api/users/wishlist/{productId}:
 *   delete:
 *     summary: Remove product from wishlist
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product removed from wishlist
 */
router.delete('/wishlist/:productId', controller.removeFromWishlist);

module.exports = router;
