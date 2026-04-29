const Variant = require('../models/variant.model');

/**
 * Calculates price for a product given selected options.
 * Falls back to product basePrice if no matching variant.
 */
const calculatePrice = async (productId, selectedAttributes = {}) => {
    const variants = await Variant.find({ product: productId, isActive: true });

    if (!variants.length) return null;

    // Find variant matching all selected attributes
    const match = variants.find((v) => {
        for (const [key, val] of Object.entries(selectedAttributes)) {
            if (v.attributes.get(key) !== val) return false;
        }
        return true;
    });

    return match ? match.price : null;
};

module.exports = { calculatePrice };
