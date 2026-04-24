const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SpeedCopy API Gateway',
      version: '2.0.0',
      description: [
        'Unified API Gateway for SpeedCopy platform.',
        '',
        '## Service Swagger Docs (direct)',
        '| Service | URL |',
        '|---------|-----|',
        '| Auth | http://localhost:4001/api-docs |',
        '| User | http://localhost:4002/api-docs |',
        '| Product | http://localhost:4003/api-docs |',
        '| Design | http://localhost:4004/api-docs |',
        '| Order | http://localhost:4005/api-docs |',
        '| Payment | http://localhost:4006/api-docs |',
        '| Notification | http://localhost:4007/api-docs |',
        '| Admin | http://localhost:4008/api-docs |',
        '| Delivery | http://localhost:4009/api-docs |',
        '| Vendor | http://localhost:4010/api-docs |',
        '| Finance | http://localhost:4011/api-docs |',
      ].join('\n'),
    },
    servers: [{ url: 'http://localhost:4000', description: 'API Gateway (all traffic goes here)' }],
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
