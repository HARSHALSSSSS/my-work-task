const { config } = require('../config/index');

const hasGoogleMapsKey = () => Boolean(config.GOOGLE_MAPS_API_KEY.trim());

const parseDurationSeconds = (duration) => {
    if (!duration) return 0;
    const parsed = Number(String(duration).trim().replace(/s$/, ''));
    return Number.isFinite(parsed) ? Math.round(parsed) : 0;
};

const isUsableCoordinate = (point) => {
    if (!point) return false;
    return (
        Number.isFinite(point.lat) &&
        Number.isFinite(point.lng) &&
        Math.abs(point.lat) <= 90 &&
        Math.abs(point.lng) <= 180 &&
        !(point.lat === 0 && point.lng === 0)
    );
};

const geocodeAddress = async (address) => {
    if (!hasGoogleMapsKey() || !address.trim()) return null;
    try {
        const url = new URL(config.GOOGLE_MAPS_GEOCODING_URL);
        url.searchParams.set('address', address.trim());
        url.searchParams.set('key', config.GOOGLE_MAPS_API_KEY);
        const response = await fetch(url.toString());
        const data = await response.json().catch(() => null);
        const location = data?.results?.[0]?.geometry?.location;
        if (!response.ok || data?.status !== 'OK' || !Number.isFinite(location?.lat)) return null;
        return { lat: Number(location.lat), lng: Number(location.lng) };
    } catch {
        return null;
    }
};

const resolveStopLocation = async (stop) => {
    if (!hasGoogleMapsKey()) return stop;
    const query = [stop.name, stop.addressLine].filter(Boolean).join(', ');
    const geocoded = await geocodeAddress(query);
    return geocoded ? { ...stop, location: geocoded } : stop;
};

const computeGoogleRoute = async ({ origin, destination, destinationType }) => {
    if (!hasGoogleMapsKey()) return null;
    if (!isUsableCoordinate(origin) || !isUsableCoordinate(destination)) return null;
    try {
        const response = await fetch(config.GOOGLE_MAPS_ROUTES_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': config.GOOGLE_MAPS_API_KEY,
                'X-Goog-FieldMask':
                    'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.distanceMeters,routes.legs.steps.navigationInstruction.instructions',
            },
            body: JSON.stringify({
                origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
                destination: {
                    location: { latLng: { latitude: destination.lat, longitude: destination.lng } },
                },
                travelMode: 'DRIVE',
                routingPreference: 'TRAFFIC_AWARE',
                polylineQuality: 'HIGH_QUALITY',
                polylineEncoding: 'ENCODED_POLYLINE',
                computeAlternativeRoutes: false,
                languageCode: 'en-US',
                units: 'METRIC',
            }),
        });
        const data = await response.json().catch(() => null);
        const route = data?.routes?.[0];
        if (!response.ok || !route?.polyline?.encodedPolyline) return null;
        const nextStep = route.legs?.[0]?.steps?.find((s) => s.navigationInstruction?.instructions);
        return {
            provider: 'google_routes',
            destinationType,
            polyline: route.polyline.encodedPolyline,
            durationSeconds: parseDurationSeconds(route.duration),
            distanceMeters: Number(route.distanceMeters || 0),
            nextInstruction: String(nextStep?.navigationInstruction?.instructions || '').trim(),
            nextInstructionDistanceMeters: Number(nextStep?.distanceMeters || 0),
            updatedAt: new Date(),
            origin,
            destination,
        };
    } catch {
        return null;
    }
};

module.exports = { resolveStopLocation, computeGoogleRoute };
