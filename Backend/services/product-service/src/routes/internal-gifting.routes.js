const { Router } = require('express');

const validate = require('../../../../shared/middlewares/validate.middleware');
const controller = require('../controllers/gifting.controller');
const { internalAuthMiddleware } = require('../middlewares/internal-auth.middleware');
const { internalResolveItemsSchema } = require('../validators/gifting.validator');

const router = Router();

/**
 * @swagger
 * /api/internal-gifting/items/resolve:
 *   post:
 *     summary: Resolve gifting items (internal)
 *     tags: [Internal Gifting]
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
