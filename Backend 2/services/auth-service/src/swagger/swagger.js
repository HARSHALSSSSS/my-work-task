const swaggerJsdoc = require('swagger-jsdoc');
const config = require('../config');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SpeedCopy Auth Service',
            version: '1.0.0',
            description: 'Authentication and authorization API',
        },
        servers: config.publicBaseUrl
            ? [{ url: config.publicBaseUrl, description: 'Auth Service' }]
            : [],
        components: {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'Firebase ID token' },
            },
        },
    },
    apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
