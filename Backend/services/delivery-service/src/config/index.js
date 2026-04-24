require('dotenv').config();

function resolveMongoUri(defaultUri) {
    const raw = String(process.env.MONGO_URI || defaultUri)
        .trim()
        .replace(/^['"]|['"]$/g, '');
    if (!raw) throw new Error('MONGO_URI is required');
    return raw;
}

const config = {
    PORT: Number(process.env.PORT ?? 4009),
    MONGO_URI: resolveMongoUri('mongodb://127.0.0.1:27017/speedcopy_delivery'),
    JWT_SECRET: process.env.JWT_SECRET ?? 'speedcopy_dev_jwt_secret_change_in_production',
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY ?? '',
    GOOGLE_MAPS_GEOCODING_URL:
        process.env.GOOGLE_MAPS_GEOCODING_URL ??
        'https://maps.googleapis.com/maps/api/geocode/json',
    GOOGLE_MAPS_ROUTES_URL:
        process.env.GOOGLE_MAPS_ROUTES_URL ??
        'https://routes.googleapis.com/directions/v2:computeRoutes',
    INTERNAL_SERVICE_TOKEN: process.env.INTERNAL_SERVICE_TOKEN ?? 'speedcopy-internal-dev-token',
    NOTIFICATION_SERVICE_URL: process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:4007',
    ORDER_SERVICE_URL: process.env.ORDER_SERVICE_URL ?? 'http://localhost:4005',
    FINANCE_SERVICE_URL: process.env.FINANCE_SERVICE_URL ?? 'http://localhost:4008',
};

module.exports = { config };
