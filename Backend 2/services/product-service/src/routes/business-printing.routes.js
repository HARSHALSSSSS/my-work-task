const { Router } = require('express');
const controller = require('../controllers/business-printing.controller');
const validate = require('../../../../shared/middlewares/validate.middleware');
const { saveBusinessPrintConfigSchema } = require('../validators/business-printing.validator');
const { upload } = require('../config/cloudinary');

const router = Router();

/**
 * @swagger
 * /home:
 *   get:
 *     summary: GET /home
 *     tags: [Business-printing]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/home', controller.getHome);

/**
 * @swagger
 * /api/products/business-printing/types:
 *   get:
 *     summary: Get all business printing product types
 *     description: Returns Business Cards, Flyers, Brochures, Posters, Letterheads, Custom Stationery
 *     tags: [Business Printing]
 *     responses:
 *       200:
 *         description: List of business print types
 */
router.get('/types', controller.getBusinessTypes);

/**
 * @swagger
 * /api/products/business-printing/products:
 *   get:
 *     summary: Get business printing products (admin-added)
 *     description: Returns all products under business printing. Filter by type.
 *     tags: [Business Printing]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [business_card, flyers, leaflets, brochures, posters, letterheads, custom_stationery]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated product list
 */
/**
 * @swagger
 * /products:
 *   get:
 *     summary: GET /products
 *     tags: [Business-printing]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/products', controller.getProducts);

/**
 * @swagger
 * /api/products/business-printing/products/{id}:
 *   get:
 *     summary: Get a single business printing product by ID
 *     tags: [Business Printing]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product with design options
 */
router.get('/products/:id', controller.getProductById);

/**
 * @swagger
 * /api/products/business-printing/service-packages:
 *   get:
 *     summary: Get delivery service packages (Standard / Express / Instant)
 *     tags: [Business Printing]
 *     responses:
 *       200:
 *         description: Service packages with pricing
 */
router.get('/service-packages', controller.getServicePackages);

/**
 * @swagger
 * /api/products/business-printing/pickup-locations:
 *   get:
 *     summary: Get nearest pickup shops by location or pincode
 *     tags: [Business Printing]
 *     parameters:
 *       - in: query
 *         name: lat
 *         schema:
 *           type: number
 *         description: User latitude (preferred for accurate location)
 *         example: 28.6139
 *       - in: query
 *         name: lng
 *         schema:
 *           type: number
 *         description: User longitude (preferred for accurate location)
 *         example: 77.2090
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 10
 *         description: Search radius in kilometers
 *         example: 15
 *       - in: query
 *         name: pincode
 *         schema:
 *           type: string
 *         description: Pincode (fallback when GPS not available)
 *         example: "110001"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: List of nearby shops sorted by distance
 *       400:
 *         description: Missing location parameters
 */
/**
 * @swagger
 * /pickup-locations:
 *   get:
 *     summary: GET /pickup-locations
 *     tags: [Business-printing]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/pickup-locations', controller.getPickupLocations);

/**
 * @swagger
 * /api/products/business-printing/configure:
 *   post:
 *     summary: Save business print configuration after design is finalized
 *     description: |
 *       Call after user finalizes their design on canvas.
 *       Returns configId to use when adding to cart or placing order.
 *     tags: [Business Printing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Config saved, returns configId
 */
router.post('/configure', validate(saveBusinessPrintConfigSchema), controller.saveConfig);

/**
 * @swagger
 * /api/products/business-printing/config/{id}:
 *   get:
 *     summary: Get a saved business print configuration
 *     tags: [Business Printing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Business print config with product and shop details
 */
router.get('/config/:id', controller.getConfig);

/**
 * @swagger
 * /api/products/printing/files:
 *   get:
 *     summary: Get uploaded files for current user
 *     tags: [Business Printing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of uploaded files
 */
router.get('/files', controller.getUploadedFiles);

/**
 * @swagger
 * /api/products/printing/upload:
 *   post:
 *     summary: Upload files for printing
 *     tags: [Business Printing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Files uploaded successfully
 */
router.post('/upload', upload.array('files', 10), controller.uploadFiles);

module.exports = router;
