const { Router } = require('express');

const validate = require('../../../../shared/middlewares/validate.middleware');
const controller = require('../controllers/gifting.controller');
const { addToCartSchema } = require('../validators/gifting.validator');

const router = Router();

/**
 * @swagger
 * /api/gifting-cart:
 *   get:
 *     summary: Get gifting cart
 *     tags: [Gifting Cart]
 *     responses:
 *       200:
 *         description: Cart contents
 *
 * /api/gifting-cart/add:
 *   post:
 *     summary: Add item to gifting cart
 *     tags: [Gifting Cart]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddToCart'
 *     responses:
 *       200:
 *         description: Item added to cart
 *
 * /api/gifting-cart/{itemId}:
 *   delete:
 *     summary: Remove item from gifting cart
 *     tags: [Gifting Cart]
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Item removed from cart
 */

/**
 * @swagger
 * /:
 *   get:
 *     summary: GET /
 *     tags: [Gifting-cart]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/', controller.getCart);
router.post('/add', validate(addToCartSchema), controller.addToCart);
router.delete('/:itemId', controller.removeCartItem);

module.exports = router;
