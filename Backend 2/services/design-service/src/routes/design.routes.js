const { Router } = require('express');
const controller = require('../controllers/design.controller');
const validate = require('../../../../shared/middlewares/validate.middleware');
const { saveDesignSchema } = require('../validators/design.validator');

const router = Router();

/**
 * @swagger
 * /api/designs/templates/premium:
 *   get:
 *     summary: Get premium templates for a product
 *     description: Returns SpeedCopy's curated premium templates for a specific product/category.
 *     tags: [Designs]
 *     parameters:
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           example: business_card
 *     responses:
 *       200:
 *         description: List of premium templates
 */
router.get('/templates/premium', controller.getPremiumTemplates);

/**
 * @swagger
 * /api/designs/templates:
 *   get:
 *     summary: Get design templates
 *     tags: [Designs]
 *     parameters:
 *       - in: query
 *         name: flowType
 *         schema:
 *           type: string
 *           enum: [gifting, business_printing, shopping]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: isPremium
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of templates
 */
/**
 * @swagger
 * /templates:
 *   get:
 *     summary: GET /templates
 *     tags: [Design]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/templates', controller.getTemplates);
router.get('/product/:productId/frames', controller.getProductFrames);

/**
 * @swagger
 * /api/designs/blank:
 *   post:
 *     summary: Create a blank canvas design (normal design type)
 *     tags: [Designs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, flowType]
 *             properties:
 *               productId:
 *                 type: string
 *               flowType:
 *                 type: string
 *                 enum: [gifting, business_printing, shopping]
 *               dimensions:
 *                 type: object
 *                 properties:
 *                   width:
 *                     type: number
 *                   height:
 *                     type: number
 *                   unit:
 *                     type: string
 *     responses:
 *       201:
 *         description: Blank canvas design created
 */
/**
 * @swagger
 * /blank:
 *   post:
 *     summary: POST /blank
 *     tags: [Design]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.post('/blank', controller.createBlankDesign);

/**
 * @swagger
 * /api/designs/from-template:
 *   post:
 *     summary: Create a design from a premium template
 *     tags: [Designs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, templateId, flowType]
 *             properties:
 *               productId:
 *                 type: string
 *               templateId:
 *                 type: string
 *               flowType:
 *                 type: string
 *                 enum: [gifting, business_printing, shopping]
 *     responses:
 *       201:
 *         description: Design created from template with canvas pre-filled
 */
/**
 * @swagger
 * /from-template:
 *   post:
 *     summary: POST /from-template
 *     tags: [Design]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.post('/from-template', controller.createFromTemplate);

/**
 * @swagger
 * /api/designs:
 *   post:
 *     summary: Save a design (full canvas JSON)
 *     tags: [Designs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Design saved
 */
router.post('/', validate(saveDesignSchema), controller.saveDesign);

/**
 * @swagger
 * /api/designs:
 *   get:
 *     summary: Get all designs for current user
 *     tags: [Designs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of designs
 */
router.get('/', controller.getMyDesigns);

/**
 * @swagger
 * /api/designs/{id}/approve:
 *   patch:
 *     summary: Mark a design as approved for reuse or reorder
 *     tags: [Designs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Design approved
 */
router.patch('/:id/approve', controller.markApproved);

/**
 * @swagger
 * /api/designs/{id}:
 *   get:
 *     summary: Get design by ID
 *     tags: [Designs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Design with canvas JSON
 */
router.get('/:id', controller.getDesign);

/**
 * @swagger
 * /api/designs/{id}:
 *   put:
 *     summary: Update/re-edit a design
 *     tags: [Designs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Design updated
 */
router.put('/:id', controller.updateDesign);

module.exports = router;
