const swaggerJsdoc = require('swagger-jsdoc');
const config = require('../config');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SpeedCopy Product Service',
            version: '1.0.0',
            description: 'Printing, gifting and shopping product APIs',
        },
        servers: config.publicBaseUrl
            ? [{ url: config.publicBaseUrl, description: 'Product Service' }]
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
