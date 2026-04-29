const { Router } = require('express');

const controller = require('../controllers/gifting.controller');

const router = Router();

/**
 * @swagger
 * /api/gifting/home:
 *   get:
 *     summary: Get gifting home page data
 *     tags: [Gifting]
 *     responses:
 *       200:
 *         description: Home page data for gifting
 *
 * /api/gifting/categories:
 *   get:
 *     summary: Get gifting categories
 *     tags: [Gifting]
 *     responses:
 *       200:
 *         description: List of gifting categories
 *
 * /api/gifting/products:
 *   get:
 *     summary: List gifting products
 *     tags: [Gifting]
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
 *         description: Paginated gifting product list
 *
 * /api/gifting/search:
 *   get:
 *     summary: Search gifting products
 *     tags: [Gifting]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *         description: Search query
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Search results
 *
 * /api/gifting/products/{identifier}:
 *   get:
 *     summary: Get gifting product by identifier
 *     tags: [Gifting]
 *     parameters:
 *       - in: path
 *         name: identifier
 *         required: true
 *         schema: { type: string }
 *         description: Product ID or slug
 *     responses:
 *       200:
 *         description: Product details
 */

/**
 * @swagger
 * /home:
 *   get:
 *     summary: GET /home
 *     tags: [Gifting]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/home', controller.getHome);
router.get('/categories', controller.getCategories);
router.get('/products', controller.listProducts);
router.get('/search', controller.searchProducts);
router.get('/products/:identifier', controller.getProduct);

module.exports = router;
