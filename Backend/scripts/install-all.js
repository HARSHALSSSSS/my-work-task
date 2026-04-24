/**
 * Runs npm install in root + all service directories.
 */
const { execSync } = require('child_process');
const path = require('path');

const dirs = [
    '.',
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

const root = path.join(__dirname, '..');

for (const dir of dirs) {
    const full = path.join(root, dir);
    console.log(`\n📦 Installing in ${dir}...`);
    try {
        execSync('npm install', { cwd: full, stdio: 'inherit' });
    } catch (err) {
        console.error(`Failed in ${dir}:`, err.message);
    }
}

console.log('\n✅ All dependencies installed.');
