const Shop = require('../models/shop.model');

const toRadians = (value) => (Number(value) * Math.PI) / 180;

const calculateDistanceKm = (source, target) => {
    if (
        !Number.isFinite(Number(source?.lat)) ||
        !Number.isFinite(Number(source?.lng)) ||
        !Number.isFinite(Number(target?.lat)) ||
        !Number.isFinite(Number(target?.lng))
    ) {
        return null;
    }

    const earthRadiusKm = 6371;
    const deltaLat = toRadians(Number(target.lat) - Number(source.lat));
    const deltaLng = toRadians(Number(target.lng) - Number(source.lng));
    const sourceLat = toRadians(source.lat);
    const targetLat = toRadians(target.lat);

    const a =
        Math.sin(deltaLat / 2) ** 2 +
        Math.cos(sourceLat) * Math.cos(targetLat) * Math.sin(deltaLng / 2) ** 2;

    return Number((earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
};

const serializeShop = (shop, userLocation = null) => {
    const distanceKm = userLocation ? calculateDistanceKm(userLocation, shop.location) : null;

    return {
        _id: shop._id,
        name: shop.name,
        address: shop.address,
        city: shop.city,
        state: shop.state,
        pincode: shop.pincode,
        phone: shop.phone || '',
        email: shop.email || '',
        working_hours: shop.workingHours || '',
        is_active: shop.isActive !== false,
        location: {
            lat: Number(shop.location?.lat) || null,
            lng: Number(shop.location?.lng) || null,
        },
        distance_km: distanceKm,
    };
};

const searchPickupLocations = async (query = {}) => {
    const { pincode, lat, lng, limit = 10, q } = query;
    const normalizedLimit = Math.max(1, Number(limit) || 10);
    const userLocation =
        lat !== undefined && lng !== undefined
            ? { lat: Number(lat), lng: Number(lng) }
            : null;

    if (userLocation && (!Number.isFinite(userLocation.lat) || !Number.isFinite(userLocation.lng))) {
        const error = new Error('lat and lng must be valid numbers');
        error.statusCode = 400;
        throw error;
    }

    if (!userLocation && !pincode && !q) {
        const error = new Error('Either pincode, search query, or lat/lng coordinates are required');
        error.statusCode = 400;
        throw error;
    }

    const filter = { isActive: true };

    if (pincode) filter.pincode = String(pincode).trim();

    if (q) {
        const pattern = new RegExp(String(q).trim(), 'i');
        filter.$or = [{ name: pattern }, { address: pattern }, { city: pattern }, { pincode: pattern }];
    }

    let shops = await Shop.find(filter).lean();

    if (!shops.length && (pincode || q)) {
        shops = await Shop.find({ isActive: true }).limit(normalizedLimit * 2).lean();
    }

    const serialized = shops.map((shop) => serializeShop(shop, userLocation));

    const sorted = serialized.sort((left, right) => {
        if (left.distance_km === null && right.distance_km === null) return left.name.localeCompare(right.name);
        if (left.distance_km === null) return 1;
        if (right.distance_km === null) return -1;
        return left.distance_km - right.distance_km;
    });

    return sorted.slice(0, normalizedLimit);
};

module.exports = {
    searchPickupLocations,
};
