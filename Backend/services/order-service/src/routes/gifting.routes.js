const { Router } = require('express');

const validate = require('../../../../shared/middlewares/validate.middleware');
const controller = require('../controllers/gifting.controller');
const { createGiftingOrderSchema } = require('../validators/gifting.validator');

const router = Router();

/**
 * @swagger
 * /api/gifting/orders:
 *   post:
 *     summary: Create gifting order
 *     tags: [Gifting Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateGiftingOrder'
 *     responses:
 *       201:
 *         description: Order created successfully
 */

router.post('/orders', validate(createGiftingOrderSchema), controller.createOrder);

module.exports = router;
