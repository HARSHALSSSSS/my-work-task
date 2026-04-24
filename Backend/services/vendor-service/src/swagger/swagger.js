const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SpeedCopy Vendor Service',
            version: '1.0.0',
            description: 'Vendor organization, stores, staff, and analytics management.',
        },
        servers: [{ url: 'http://localhost:4010', description: 'Vendor Service' }],
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
