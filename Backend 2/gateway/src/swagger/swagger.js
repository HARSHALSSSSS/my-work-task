const swaggerJsdoc = require('swagger-jsdoc');
const gatewayBaseUrl =
  process.env.GATEWAY_PUBLIC_URL ||
  process.env.SERVICE_PUBLIC_URL ||
  `http://localhost:${process.env.PORT || 8080}`;

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SpeedCopy API Gateway',
      version: '2.0.0',
      description: [
        'Unified API Gateway for SpeedCopy platform.',
        '',
        'Set the corresponding `*_SERVICE_URL` environment variables to point the gateway at deployed services.',
      ].join('\n'),
    },
    servers: [{ url: gatewayBaseUrl, description: 'API Gateway (all traffic goes here)' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
