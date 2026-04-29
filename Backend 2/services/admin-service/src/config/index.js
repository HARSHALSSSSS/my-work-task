require('dotenv').config();

const requireEnv = (envName) => {
    const value = process.env[envName];
    if (!value) {
        throw new Error(`${envName} is not set`);
    }

    return value;
};

module.exports = {
    port: Number(process.env.PORT || 8080),
    mongoUri: requireEnv('MONGO_URI'),
    internalServiceToken: process.env.INTERNAL_SERVICE_TOKEN || 'speedcopy-internal-dev-token',
    authServiceUrl: process.env.AUTH_SERVICE_URL,
    notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL,
    dbUris: {
        auth: process.env.AUTH_DB_URI,
        user: process.env.USER_DB_URI,
        finance: process.env.FINANCE_DB_URI,
        order: process.env.ORDER_DB_URI,
        vendor: process.env.VENDOR_DB_URI,
        notification: process.env.NOTIFICATION_DB_URI,
        delivery: process.env.DELIVERY_DB_URI,
        product: process.env.PRODUCT_DB_URI,
    },
    dbNames: {
        auth: 'speedcopy_auth',
        user: 'speedcopy_user',
        finance: 'speedcopy_finance',
        order: 'speedcopy_orders',
        vendor: 'speedcopy_vendors',
        notification: 'speedcopy_notification',
        delivery: 'speedcopy_delivery',
        product: 'speedcopy_products',
    },
    deriveDbUri(name) {
        const dbName = this.dbNames[name];
        if (!dbName) {
            throw new Error(`Unknown database name for service: ${name}`);
        }

        return this.mongoUri.replace(/\/([^/?]+)(\?.*)?$/, `/${dbName}$2`);
    },
    getDbUri(name) {
        return this.dbUris[name] || this.deriveDbUri(name);
    },
    publicBaseUrl:
        process.env.ADMIN_SERVICE_PUBLIC_URL ||
        process.env.SERVICE_PUBLIC_URL,
};
