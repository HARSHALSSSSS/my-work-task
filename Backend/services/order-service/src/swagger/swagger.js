const swaggerJsdoc = require('swagger-jsdoc');
const options = {
    definition: {
        openapi: '3.0.0',
        info: { title: 'SpeedCopy Order Service', version: '1.0.0' },
        servers: [{ url: 'http://localhost:4005' }],
        components: {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
            },
        },
    },
    apis: ['./src/routes/*.js'],
};
module.exports = swaggerJsdoc(options);
