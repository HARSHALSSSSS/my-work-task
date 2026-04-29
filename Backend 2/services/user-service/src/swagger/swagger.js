const swaggerJsdoc = require('swagger-jsdoc');
const config = require('../config');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SpeedCopy User Service',
            version: '1.0.0',
            description: 'User profiles and addresses API',
        },
        servers: config.publicBaseUrl
            ? [{ url: config.publicBaseUrl, description: 'User Service' }]
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
