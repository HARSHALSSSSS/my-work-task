const { Router } = require('express');

const validate = require('../../../../shared/middlewares/validate.middleware');
const controller = require('../controllers/shopping.controller');
const { createShoppingOrderSchema } = require('../validators/shopping.validator');

const router = Router();

/**
 * @swagger
 * /api/shopping/orders:
 *   post:
 *     summary: Create shopping order
 *     tags: [Shopping Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateShoppingOrder'
 *     responses:
 *       201:
 *         description: Order created successfully
 */

router.post('/orders', validate(createShoppingOrderSchema), controller.createOrder);

module.exports = router;
