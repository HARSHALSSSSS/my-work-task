const { Router } = require('express');

const validate = require('../../../../shared/middlewares/validate.middleware');
const controller = require('../controllers/gifting.controller');
const { adminOnly } = require('../middlewares/admin.middleware');
const {
    createGiftingProductSchema,
    updateGiftingProductSchema,
    createGiftingCategorySchema,
    updateGiftingCategorySchema,
} = require('../validators/gifting.validator');

const router = Router();

/**
 * @swagger
 * /api/admin-gifting/products:
 *   post:
 *     summary: Create gifting product (admin)
 *     tags: [Admin Gifting]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateGiftingProduct'
 *     responses:
 *       201:
 *         description: Product created
 *
 * /api/admin-gifting/products/{id}:
 *   put:
 *     summary: Update gifting product (admin)
 *     tags: [Admin Gifting]
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
 *             $ref: '#/components/schemas/UpdateGiftingProduct'
 *     responses:
 *       200:
 *         description: Product updated
 *   delete:
 *     summary: Delete gifting product (admin)
 *     tags: [Admin Gifting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product deleted
 *
 * /api/admin-gifting/categories:
 *   post:
 *     summary: Create gifting category (admin)
 *     tags: [Admin Gifting]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateGiftingCategory'
 *     responses:
 *       201:
 *         description: Category created
 *
 * /api/admin-gifting/categories/{id}:
 *   put:
 *     summary: Update gifting category (admin)
 *     tags: [Admin Gifting]
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
 *             $ref: '#/components/schemas/UpdateGiftingCategory'
 *     responses:
 *       200:
 *         description: Category updated
 */

/**
 * @swagger
 * /products:
 *   get:
 *     summary: List gifting products (admin)
 *     tags: [Admin Gifting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of gifting products
 *   post:
 *     summary: Create gifting product (admin)
 *     tags: [Admin Gifting]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateGiftingProduct'
 *     responses:
 *       201:
 *         description: Product created
 */
router.get('/products', adminOnly, controller.listProducts);
router.post('/products', adminOnly, validate(createGiftingProductSchema), controller.createProduct);
router.put(
    '/products/:id',
    adminOnly,
    validate(updateGiftingProductSchema),
    controller.updateProduct
);
router.delete('/products/:id', adminOnly, controller.deleteProduct);

router.post(
    '/categories',
    adminOnly,
    validate(createGiftingCategorySchema),
    controller.createCategory
);
router.put(
    '/categories/:id',
    adminOnly,
    validate(updateGiftingCategorySchema),
    controller.updateCategory
);

module.exports = router;
