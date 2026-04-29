const { Router } = require('express');
const controller = require('../controllers/cart.controller');

const router = Router();

/**
 * @swagger
 * /api/orders/cart:
 *   get:
 *     summary: Get current user's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart with items and subtotal
 */
router.get('/', controller.getCart);

/**
 * @swagger
 * /api/orders/cart:
 *   post:
 *     summary: Add item to cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, productName, flowType, quantity, unitPrice, totalPrice]
 *             properties:
 *               productId:
 *                 type: string
 *               productName:
 *                 type: string
 *               flowType:
 *                 type: string
 *                 enum: [printing, gifting, shopping]
 *               printConfigId:
 *                 type: string
 *                 description: For document printing
 *               businessPrintConfigId:
 *                 type: string
 *                 description: For business printing
 *               designId:
 *                 type: string
 *                 description: For gifting/shopping
 *               variantId:
 *                 type: string
 *               thumbnail:
 *                 type: string
 *               quantity:
 *                 type: integer
 *               unitPrice:
 *                 type: number
 *               totalPrice:
 *                 type: number
 *     responses:
 *       201:
 *         description: Item added to cart
 */
/**
 * @swagger
 * /:
 *   post:
 *     summary: POST /
 *     tags: [Cart]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.post('/', controller.addToCart);

/**
 * @swagger
 * /api/orders/cart/{itemId}:
 *   patch:
 *     summary: Update cart item quantity
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Cart updated
 */
/**
 * @swagger
 * /{itemId}:
 *   patch:
 *     summary: PATCH /{itemId}
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.patch('/:itemId', controller.updateCartItem);

/**
 * @swagger
 * /api/orders/cart/{itemId}:
 *   delete:
 *     summary: Remove item from cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Item removed
 */
router.delete('/:itemId', controller.removeFromCart);

/**
 * @swagger
 * /api/orders/cart/clear:
 *   delete:
 *     summary: Clear entire cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared
 */
router.delete('/clear', controller.clearCart);

/**
 * @swagger
 * /api/orders/cart/apply-coupon:
 *   post:
 *     summary: Apply a coupon code to cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, subtotal]
 *             properties:
 *               code:
 *                 type: string
 *               subtotal:
 *                 type: number
 *               flowType:
 *                 type: string
 *                 enum: [printing, gifting, shopping]
 *     responses:
 *       200:
 *         description: Coupon applied with discount amount
 */
const couponController = require('../controllers/coupon.controller');
/**
 * @swagger
 * /apply-coupon:
 *   post:
 *     summary: POST /apply-coupon
 *     tags: [Cart]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.post('/apply-coupon', couponController.applyCoupon);

module.exports = router;
