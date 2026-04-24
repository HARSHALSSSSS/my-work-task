const { Router } = require('express');
const controller = require('../controllers/product.controller');
const validate = require('../../../../shared/middlewares/validate.middleware');
const { createProductSchema, updateProductSchema } = require('../validators/product.validator');
const { adminOnly } = require('../middlewares/admin.middleware');

const router = Router();

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products (filterable by category, flowType, search)
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: flowType
 *         schema:
 *           type: string
 *           enum: [printing, gifting, shopping]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated product list
 */
/**
 * @swagger
 * /:
 *   get:
 *     summary: GET /
 *     tags: [Product]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/', controller.getProducts);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product data with variants
 */
router.get('/:id', controller.getProductById);

/**
 * @swagger
 * /api/products/slug/{slug}:
 *   get:
 *     summary: Get product by slug
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product data
 */
router.get('/slug/:slug', controller.getProductBySlug);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a product (admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Product created
 */
router.post('/', adminOnly, validate(createProductSchema), controller.createProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update a product (admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Product updated
 */
router.put('/:id', adminOnly, validate(updateProductSchema), controller.updateProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Soft-delete a product (admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Product deleted
 */
router.delete('/:id', adminOnly, controller.deleteProduct);

module.exports = router;
