const swaggerJsdoc = require('swagger-jsdoc');
const config = require('../config');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SpeedCopy Payment Service',
            version: '1.0.0',
            description: 'Payment orchestration and webhook handling',
        },
        servers: config.publicBaseUrl
            ? [{ url: config.publicBaseUrl, description: 'Payment Service' }]
            : [],
        components: {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
            },
        },
    },
    apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
