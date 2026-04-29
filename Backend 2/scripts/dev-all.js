/**
 * Starts all services in development mode using concurrently + nodemon.
 */
const { execSync } = require('child_process');
const path = require('path');

const services = [
    'gateway',
    'services/auth-service',
    'services/user-service',
    'services/product-service',
    'services/design-service',
    'services/order-service',
    'services/payment-service',
    'services/notification-service',
    'services/admin-service',
    'services/delivery-service',
    'services/vendor-service',
    'services/finance-service',
];

const commands = services
    .map((s) => `"cd ${path.join(__dirname, '..', s)} && nodemon src/server.js"`)
    .join(' ');

const names = services.map((s) => s.split('/').pop()).join(',');

try {
    execSync(`npx concurrently --kill-others-on-fail --names "${names}" ${commands}`, {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
    });
} catch {
    process.exit(1);
}
