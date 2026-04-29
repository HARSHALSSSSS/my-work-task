const swaggerJsdoc = require('swagger-jsdoc');
const config = require('../config');

const options = {
    definition: {
        openapi: '3.0.0',
        info: { title: 'SpeedCopy Notification Service', version: '1.0.0' },
        servers: config.publicBaseUrl ? [{ url: config.publicBaseUrl }] : [],
        components: {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
            },
        },
    },
    apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
