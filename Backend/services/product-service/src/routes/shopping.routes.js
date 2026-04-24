const { Router } = require('express');
const controller = require('../controllers/shopping.controller');

const router = Router();

/**
 * @swagger
 * /api/shopping/home:
 *   get:
 *     summary: Get home page data
 *     tags: [Shopping]
 *     responses:
 *       200:
 *         description: Home page data including banners, categories, trending products
 *
 * /api/shopping/categories:
 *   get:
 *     summary: Get all shopping categories
 *     tags: [Shopping]
 *     responses:
 *       200:
 *         description: List of categories
 *
 * /api/shopping/products:
 *   get:
 *     summary: List shopping products
 *     tags: [Shopping]
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
 *         description: Paginated product list
 *
 * /api/shopping/products/{slug}:
 *   get:
 *     summary: Get product by slug
 *     tags: [Shopping]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product details
 *
 * /api/shopping/deals:
 *   get:
 *     summary: Get current deals
 *     tags: [Shopping]
 *     responses:
 *       200:
 *         description: List of deals
 *
 * /api/shopping/trending:
 *   get:
 *     summary: Get trending products
 *     tags: [Shopping]
 *     responses:
 *       200:
 *         description: List of trending products
 *
 * /api/shopping/search:
 *   get:
 *     summary: Search products
 *     tags: [Shopping]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *         description: Search query
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
 *         description: Search results
 */

/**
 * @swagger
 * /home:
 *   get:
 *     summary: GET /home
 *     tags: [Shopping]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/home', controller.getHome);
router.get('/categories', controller.getCategories);
router.get('/products', controller.listProducts);
router.get('/products/:slug', controller.getProductBySlug);
router.get('/deals', controller.getDeals);
router.get('/trending', controller.getTrending);
router.get('/search', controller.searchProducts);

module.exports = router;
