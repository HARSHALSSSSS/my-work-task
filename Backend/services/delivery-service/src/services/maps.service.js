const { Client } = require('@googlemaps/google-maps-services-js');

const client = new Client({});
const key = process.env.GOOGLE_MAPS_API_KEY;

const calculateDistanceAndEta = async (originLat, originLng, destLat, destLng) => {
    if (!key) {
        console.warn('Google Maps API Key is missing. Using mock values.');
        return { distanceKm: 1.5, etaMinutes: 5 };
    }

    try {
        const response = await client.distancematrix({
            params: {
                origins: [{ lat: originLat, lng: originLng }],
                destinations: [{ lat: destLat, lng: destLng }],
                key: key,
            },
            timeout: 5000,
        });

        const element = response.data.rows[0].elements[0];
        if (element.status === 'OK') {
            const distanceMeters = element.distance.value;
            const durationSeconds = element.duration.value;
            
            return {
                distanceKm: parseFloat((distanceMeters / 1000).toFixed(2)),
                etaMinutes: Math.ceil(durationSeconds / 60),
            };
        }
        
        throw new Error(`Google Maps API error: ${element.status}`);
    } catch (error) {
        console.error('Error calculating distance and ETA:', error);
        return { distanceKm: 2.0, etaMinutes: 10 };
    }
};

module.exports = {
    calculateDistanceAndEta,
};
