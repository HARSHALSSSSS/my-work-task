const { Router } = require('express');
const controller = require('../controllers/printing.controller');
const validate = require('../../../../shared/middlewares/validate.middleware');
const { savePrintConfigSchema } = require('../validators/printing.validator');
const { upload } = require('../config/cloudinary');

const router = Router();

/**
 * @swagger
 * /home:
 *   get:
 *     summary: GET /home
 *     tags: [Printing]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/home', controller.getHome);

/**
 * @swagger
 * /api/products/printing/document-types:
 *   get:
 *     summary: Get all document print types with their config options
 *     description: Returns Standard Printing, Soft Binding, Spiral Binding, Thesis Binding with available options for each.
 *     tags: [Document Printing]
 *     responses:
 *       200:
 *         description: List of print types
 */
router.get('/document-types', controller.getDocumentTypes);
router.get('/document-types/:type', controller.getDocumentType);

/**
 * @swagger
 * /api/products/printing/service-packages:
 *   get:
 *     summary: Get delivery service packages (Standard / Express / Instant)
 *     tags: [Document Printing]
 *     responses:
 *       200:
 *         description: List of service packages with pricing
 */
router.get('/service-packages', controller.getServicePackages);

/**
 * @swagger
 * /api/products/printing/pickup-locations:
 *   get:
 *     summary: Get nearest pickup shops by location or pincode
 *     tags: [Document Printing]
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
 *     tags: [Printing]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/pickup-locations', controller.getPickupLocations);

/**
 * @swagger
 * /api/products/printing/upload:
 *   post:
 *     summary: Upload print files (PDF, DOC, DOCX, JPG, PNG)
 *     tags: [Document Printing]
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
 *       200:
 *         description: Uploaded file URLs
 */
/**
 * @swagger
 * /upload:
 *   post:
 *     summary: POST /upload
 *     tags: [Printing]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.post('/upload', upload.array('files', 10), controller.uploadFiles);

/**
 * @swagger
 * /api/products/printing/configure:
 *   post:
 *     summary: Save print configuration (files + options + delivery method)
 *     description: |
 *       Call this after user has uploaded files and selected all options.
 *       Returns a configId to use when placing the order.
 *     tags: [Document Printing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Print config saved, returns configId
 */
router.post('/configure', validate(savePrintConfigSchema), controller.savePrintConfig);

/**
 * @swagger
 * /api/products/printing/config/{id}:
 *   get:
 *     summary: Get a saved print configuration
 *     tags: [Document Printing]
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
 *         description: Print configuration details
 */
router.get('/config/:id', controller.getPrintConfig);

module.exports = router;
