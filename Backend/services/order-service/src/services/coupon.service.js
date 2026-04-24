const Coupon = require('../models/coupon.model');
const Order = require('../models/order.model');

const applyCoupon = async (userId, { code, subtotal, flowType }) => {
    const coupon = await Coupon.findOne({
        code: code.toUpperCase(),
        isActive: true,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    });

    if (!coupon) {
        const err = new Error('Invalid or expired coupon code');
        err.statusCode = 400;
        throw err;
    }

    if (coupon.minOrderValue > 0 && subtotal < coupon.minOrderValue) {
        const err = new Error(`Minimum order value of ₹${coupon.minOrderValue} required`);
        err.statusCode = 400;
        throw err;
    }

    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
        const err = new Error('Coupon usage limit reached');
        err.statusCode = 400;
        throw err;
    }

    if (
        coupon.applicableFlows.length > 0 &&
        flowType &&
        !coupon.applicableFlows.includes(flowType)
    ) {
        const err = new Error(`Coupon not applicable for ${flowType} orders`);
        err.statusCode = 400;
        throw err;
    }

    // Check per-user usage
    if (coupon.perUserLimit > 0) {
        const userUsage = await Order.countDocuments({ userId, couponCode: coupon.code });
        if (userUsage >= coupon.perUserLimit) {
            const err = new Error('You have already used this coupon');
            err.statusCode = 400;
            throw err;
        }
    }

    let discount = 0;
    if (coupon.discountType === 'percentage') {
        discount = (subtotal * coupon.discountValue) / 100;
        if (coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
    } else {
        discount = coupon.discountValue;
    }

    discount = Math.min(discount, subtotal); // can't discount more than subtotal
    discount = Math.round(discount * 100) / 100;

    return {
        couponCode: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discount,
        finalTotal: subtotal - discount,
    };
};

module.exports = { applyCoupon };
