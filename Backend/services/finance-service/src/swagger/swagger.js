const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SpeedCopy Finance Service',
            version: '1.0.0',
            description: 'Wallet, ledger, referrals, vendor payouts, and refunds.',
        },
        servers: [{ url: 'http://localhost:4011', description: 'Finance Service' }],
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
