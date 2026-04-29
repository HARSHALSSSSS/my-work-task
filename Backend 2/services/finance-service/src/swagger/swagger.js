const swaggerJsdoc = require('swagger-jsdoc');
const config = require('../config');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SpeedCopy Finance Service',
            version: '1.0.0',
            description: 'Wallet, payouts and refunds API',
        },
        servers: config.publicBaseUrl
            ? [{ url: config.publicBaseUrl, description: 'Finance Service' }]
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
