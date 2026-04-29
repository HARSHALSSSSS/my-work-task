require('dotenv').config();

const requireEnv = (envName) => {
    const value = process.env[envName];
    if (!value) {
        throw new Error(`${envName} is not set`);
    }

    return value;
};

const config = {
    PORT: Number(process.env.PORT ?? 8080),
    MONGO_URI: requireEnv('MONGO_URI'),
    JWT_SECRET: process.env.JWT_SECRET ?? 'speedcopy_dev_jwt_secret_change_in_production',
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY ?? '',
    GOOGLE_MAPS_GEOCODING_URL:
        process.env.GOOGLE_MAPS_GEOCODING_URL ??
        'https://maps.googleapis.com/maps/api/geocode/json',
    GOOGLE_MAPS_ROUTES_URL:
        process.env.GOOGLE_MAPS_ROUTES_URL ??
        'https://routes.googleapis.com/directions/v2:computeRoutes',
    INTERNAL_SERVICE_TOKEN: process.env.INTERNAL_SERVICE_TOKEN ?? 'speedcopy-internal-dev-token',
    NOTIFICATION_SERVICE_URL: process.env.NOTIFICATION_SERVICE_URL,
    ORDER_SERVICE_URL: process.env.ORDER_SERVICE_URL,
    FINANCE_SERVICE_URL: process.env.FINANCE_SERVICE_URL,
    DELIVERY_PAYOUT_BASE: Number(process.env.DELIVERY_PAYOUT_BASE ?? 58),
    DELIVERY_PAYOUT_PER_KM: Number(process.env.DELIVERY_PAYOUT_PER_KM ?? 18),
    DELIVERY_PAYOUT_PER_ITEM: Number(process.env.DELIVERY_PAYOUT_PER_ITEM ?? 12),
    PUBLIC_BASE_URL:
        process.env.DELIVERY_SERVICE_PUBLIC_URL ??
        process.env.SERVICE_PUBLIC_URL,
};

module.exports = { config };
