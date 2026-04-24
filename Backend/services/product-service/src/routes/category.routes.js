const { Router } = require('express');
const controller = require('../controllers/category.controller');
const { adminOnly } = require('../middlewares/admin.middleware');

const router = Router();

/**
 * @swagger
 * /api/products/categories:
 *   get:
 *     summary: Get all categories with subcategories
 *     description: Returns printing, gifting, and shopping categories. Filter by flowType.
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: flowType
 *         schema:
 *           type: string
 *           enum: [printing, gifting, shopping]
 *         description: Filter by flow type
 *     responses:
 *       200:
 *         description: List of categories with nested subcategories
 */
router.get('/', controller.getCategories);

/**
 * @swagger
 * /api/products/categories/{slug}:
 *   get:
 *     summary: Get category by slug with subcategories
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: printing
 *     responses:
 *       200:
 *         description: Category with subcategories
 *       404:
 *         description: Category not found
 */
router.get('/:slug', controller.getCategoryBySlug);

/**
 * @swagger
 * /api/products/categories/{id}/subcategories:
 *   get:
 *     summary: Get subcategories for a category
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of subcategories
 */
router.get('/:id/subcategories', controller.getSubcategories);

// ─── Admin only ────────────────────────────────────────────

/**
 * @swagger
 * /api/products/categories:
 *   post:
 *     summary: Create a category (admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Category created
 */
router.post('/', adminOnly, controller.createCategory);

/**
 * @swagger
 * /api/products/categories/{id}:
 *   put:
 *     summary: Update a category (admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Category updated
 */
router.put('/:id', adminOnly, controller.updateCategory);

/**
 * @swagger
 * /api/products/categories/{id}:
 *   delete:
 *     summary: Delete a category (admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Category deleted
 */
router.delete('/:id', adminOnly, controller.deleteCategory);

/**
 * @swagger
 * /api/products/subcategories:
 *   post:
 *     summary: Create a subcategory (admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Subcategory created
 */
router.post('/subcategories', adminOnly, controller.createSubcategory);

/**
 * @swagger
 * /api/products/subcategories/{id}:
 *   put:
 *     summary: Update a subcategory (admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subcategory updated
 */
router.put('/subcategories/:id', adminOnly, controller.updateSubcategory);

module.exports = router;
