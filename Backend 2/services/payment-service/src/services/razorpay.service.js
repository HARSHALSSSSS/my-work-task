/**
 * Razorpay payment service.
 * If RAZORPAY_KEY_ID is not set, runs in MOCK MODE.
 * Mock mode returns realistic dummy responses — no Razorpay account needed.
 *
 * To switch to real Razorpay:
 *   Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in payment-service/.env
 */
const crypto = require('crypto');
const Payment = require('../models/payment.model');
const config = require('../config');

const isMock = !config.razorpay.keyId || config.razorpay.keyId === 'your_razorpay_key_id';

if (isMock) {
    console.log('[Razorpay] 🔧 MOCK MODE — using dummy payments (no credentials configured)');
}

// ─── Mock helpers ─────────────────────────────────────────
const mockRzpOrderId = () => `order_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const mockRzpPaymentId = () => `pay_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const createRazorpayOrderViaRest = async ({ amount, currency, receipt, notes = {} }) => {
    const auth = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, currency, receipt, notes }),
    });

    const text = await response.text();
    let payload = null;
    try {
        payload = text ? JSON.parse(text) : null;
    } catch {
        payload = { raw: text };
    }

    if (!response.ok) {
        const err = new Error(
            payload?.error?.description ||
            payload?.description ||
            payload?.message ||
            `Razorpay order creation failed with status ${response.status}`
        );
        err.statusCode = response.status;
        err.details = payload;
        throw err;
    }

    return payload;
};

/**
 * Notify order-service that payment is complete.
 * Fire-and-forget — payment is already recorded, order update is best-effort.
 */
const notifyOrderPaid = async (orderId, paymentId) => {
    try {
        const res = await fetch(`${config.orderServiceUrl}/api/orders/${orderId}/delivery-status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-token': config.internalServiceToken,
            },
            body: JSON.stringify({
                deliveryStatus: 'payment_confirmed',
                mappedOrderStatus: 'confirmed',
            }),
        });
        if (!res.ok) {
            console.warn(`[Payment] Order status update failed for ${orderId}: ${res.status}`);
        }
    } catch (err) {
        console.warn(`[Payment] Could not notify order-service: ${err.message}`);
    }
};

/**
 * Creates a payment order.
 * Mock: returns a fake Razorpay order object.
 * Real: calls Razorpay API.
 */
const createPayment = async (userId, { orderId, amount, currency = 'INR' }) => {
    const amountInPaise = Math.round(amount * 100);

    if (isMock) {
        const rzpOrderId = mockRzpOrderId();
        const payment = await Payment.create({
            userId,
            orderId,
            razorpayOrderId: rzpOrderId,
            amount: amountInPaise,
            currency,
            status: 'created',
        });

        return {
            payment,
            razorpayOrderId: rzpOrderId,
            amount: amountInPaise,
            currency,
            keyId: 'mock_key_id',
            mock: true,
            note: 'MOCK MODE — use verifyPayment with any razorpayPaymentId to simulate success',
        };
    }

    const rzpOrder = await createRazorpayOrderViaRest({
        amount: amountInPaise,
        currency,
        receipt: orderId,
        notes: {
            userId,
            purpose: 'payment',
        },
    });

    const payment = await Payment.create({
        userId,
        orderId,
        razorpayOrderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency,
        status: 'created',
    });

    return {
        payment,
        razorpayOrderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency,
        keyId: config.razorpay.keyId,
    };
};

/**
 * Verifies payment signature.
 * Mock: always succeeds — marks payment as paid.
 * Real: verifies HMAC signature from Razorpay.
 */
const verifyPayment = async ({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
    if (isMock) {
        // In mock mode, auto-generate a valid-looking signature
        const payment = await Payment.findOneAndUpdate(
            { razorpayOrderId },
            {
                razorpayPaymentId: razorpayPaymentId || mockRzpPaymentId(),
                razorpaySignature: razorpaySignature || 'mock_signature_verified',
                status: 'paid',
            },
            { new: true }
        );

        if (!payment) {
            const err = new Error('Payment record not found');
            err.statusCode = 404;
            throw err;
        }

        await notifyOrderPaid(payment.orderId, payment.razorpayPaymentId);
        return { ...payment.toObject(), mock: true };
    }

    // Real Razorpay signature verification
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
        .createHmac('sha256', config.razorpay.keySecret)
        .update(body)
        .digest('hex');

    if (expectedSignature !== razorpaySignature) {
        const err = new Error('Payment verification failed — invalid signature');
        err.statusCode = 400;
        throw err;
    }

    const payment = await Payment.findOneAndUpdate(
        { razorpayOrderId },
        { razorpayPaymentId, razorpaySignature, status: 'paid' },
        { new: true }
    );

    if (!payment) {
        const err = new Error('Payment record not found');
        err.statusCode = 404;
        throw err;
    }

    await notifyOrderPaid(payment.orderId, payment.razorpayPaymentId);
    return payment;
};

module.exports = { createPayment, verifyPayment };
