const { Router } = require('express');

const validate = require('../../../../shared/middlewares/validate.middleware');
const controller = require('../controllers/shopping.controller');
const { addToCartSchema } = require('../validators/shopping.validator');

const router = Router();

/**
 * @swagger
 * /api/public-cart:
 *   get:
 *     summary: Get public cart
 *     tags: [Public Cart]
 *     responses:
 *       200:
 *         description: Cart contents
 *
 * /api/public-cart/add:
 *   post:
 *     summary: Add item to public cart
 *     tags: [Public Cart]
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
 * /api/public-cart/{itemId}:
 *   delete:
 *     summary: Remove item from public cart
 *     tags: [Public Cart]
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
 *     tags: [Public-cart]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/', controller.getCart);
router.post('/add', validate(addToCartSchema), controller.addToCart);
router.delete('/:itemId', controller.removeCartItem);

module.exports = router;
