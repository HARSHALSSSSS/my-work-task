const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SpeedCopy Product Service',
            version: '1.0.0',
            description: 'Unified product API for Printing, Gifting, and Shopping',
        },
        servers: [{ url: 'http://localhost:4003', description: 'Product Service' }],
        components: {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
            },
        },
    },
    apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
