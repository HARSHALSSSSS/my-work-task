const { Router } = require('express');

const validate = require('../../../../shared/middlewares/validate.middleware');
const controller = require('../controllers/shopping.controller');
const { internalAuthMiddleware } = require('../middlewares/internal-auth.middleware');
const { internalResolveItemsSchema } = require('../validators/shopping.validator');

const router = Router();

/**
 * @swagger
 * /api/internal-shopping/items/resolve:
 *   post:
 *     summary: Resolve shopping items (internal)
 *     tags: [Internal Shopping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InternalResolveItems'
 *     responses:
 *       200:
 *         description: Items resolved successfully
 */

router.post(
    '/items/resolve',
    internalAuthMiddleware,
    validate(internalResolveItemsSchema),
    controller.resolveItems
);

module.exports = router;
