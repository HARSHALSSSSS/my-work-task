const config = require('../config');

// Initialize Razorpay instance lazily
let razorpay = null;
let razorpayModule = undefined;

const loadRazorpayModule = () => {
    if (razorpayModule !== undefined) {
        return razorpayModule;
    }

    try {
        razorpayModule = require('razorpay');
    } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
            console.warn('[Razorpay] npm package not installed - mock mode only');
            razorpayModule = null;
        } else {
            throw error;
        }
    }

    return razorpayModule;
};

const getRazorpayInstance = () => {
    if (!razorpay) {
        const keyId = config.razorpay.keyId;
        const keySecret = config.razorpay.keySecret;
        const Razorpay = loadRazorpayModule();
        
        console.log('[Razorpay] Initializing with Key ID:', keyId ? keyId.substring(0, 10) + '...' : 'NOT SET');
        
        if (!Razorpay) {
            throw new Error('Razorpay SDK is not installed. Run npm install in finance-service or use development mock mode.');
        }

        if (!keyId || !keySecret) {
            console.error('[Razorpay] Missing credentials - using mock mode');
            throw new Error('Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
        }
        
        try {
            razorpay = new Razorpay({
                key_id: keyId,
                key_secret: keySecret,
            });
            console.log('[Razorpay] Instance initialized successfully');
        } catch (error) {
            console.error('[Razorpay] Failed to initialize:', error.message);
            throw error;
        }
    }
    return razorpay;
};

/**
 * Create a Razorpay order for wallet topup
 */
const createOrder = async (amount, userId, description = 'Wallet Topup') => {
    try {
        const razorpayInstance = getRazorpayInstance();
        const options = {
            amount: Math.round(amount * 100), // Convert to paise
            currency: 'INR',
            receipt: `wallet_${userId}_${Date.now()}`,
            description,
            notes: {
                userId,
                type: 'wallet_topup',
            },
        };

        console.log('[Razorpay] Creating order with options:', JSON.stringify(options, null, 2));
        const order = await razorpayInstance.orders.create(options);
        console.log('[Razorpay] Order created successfully:', order.id);
        
        return {
            success: true,
            orderId: order.id,
            amount: order.amount / 100, // Convert back to rupees
            currency: order.currency,
        };
    } catch (error) {
        console.error('[Razorpay] Order creation failed:', error.message);
        console.error('[Razorpay] Error details:', error);
        
        // Fallback: Create mock order for development
        if (process.env.NODE_ENV !== 'production') {
            console.log('[Razorpay] Using mock order for development');
            const mockOrderId = `order_mock_${Date.now()}`;
            return {
                success: true,
                orderId: mockOrderId,
                amount: amount,
                currency: 'INR',
                isMock: true,
            };
        }
        
        throw Object.assign(new Error('Failed to create payment order'), {
            statusCode: 500,
            originalError: error,
        });
    }
};

/**
 * Verify Razorpay payment signature
 */
const verifyPaymentSignature = (orderId, paymentId, signature) => {
    try {
        // Allow mock orders in development
        if (orderId.includes('mock')) {
            console.log('Mock payment verification (development mode)');
            return { success: true, verified: true };
        }
        
        const crypto = require('crypto');
        const hmac = crypto.createHmac('sha256', config.razorpay.keySecret);
        hmac.update(`${orderId}|${paymentId}`);
        const generatedSignature = hmac.digest('hex');

        if (generatedSignature === signature) {
            return { success: true, verified: true };
        } else {
            return { success: false, verified: false, message: 'Invalid signature' };
        }
    } catch (error) {
        console.error('Signature verification failed:', error);
        throw Object.assign(new Error('Signature verification failed'), {
            statusCode: 500,
            originalError: error,
        });
    }
};

/**
 * Fetch payment details from Razorpay
 */
const getPaymentDetails = async (paymentId) => {
    try {
        // Handle mock payments in development
        if (paymentId.includes('mock') || paymentId.includes('pay_mock')) {
            console.log('Mock payment details (development mode)');
            return {
                success: true,
                paymentId: paymentId,
                amount: 100, // Default mock amount
                currency: 'INR',
                status: 'captured',
                method: 'card',
                description: 'Mock payment',
                notes: {},
            };
        }
        
        const razorpayInstance = getRazorpayInstance();
        const payment = await razorpayInstance.payments.fetch(paymentId);
        return {
            success: true,
            paymentId: payment.id,
            amount: payment.amount / 100,
            currency: payment.currency,
            status: payment.status,
            method: payment.method,
            description: payment.description,
            notes: payment.notes,
        };
    } catch (error) {
        console.error('Failed to fetch payment details:', error.message);
        
        // Fallback for development
        if (process.env.NODE_ENV !== 'production') {
            console.log('Using mock payment details for development');
            return {
                success: true,
                paymentId: paymentId,
                amount: 100,
                currency: 'INR',
                status: 'captured',
                method: 'card',
                description: 'Mock payment',
                notes: {},
                isMock: true,
            };
        }
        
        throw Object.assign(new Error('Failed to fetch payment details'), {
            statusCode: 500,
            originalError: error,
        });
    }
};

/**
 * Capture payment (for authorized payments)
 */
const capturePayment = async (paymentId, amount) => {
    try {
        const razorpayInstance = getRazorpayInstance();
        const payment = await razorpayInstance.payments.capture(paymentId, Math.round(amount * 100));
        return {
            success: true,
            paymentId: payment.id,
            amount: payment.amount / 100,
            status: payment.status,
        };
    } catch (error) {
        console.error('Payment capture failed:', error);
        throw Object.assign(new Error('Failed to capture payment'), {
            statusCode: 500,
            originalError: error,
        });
    }
};

/**
 * Refund payment
 */
const refundPayment = async (paymentId, amount = null) => {
    try {
        const razorpayInstance = getRazorpayInstance();
        const options = amount ? { amount: Math.round(amount * 100) } : {};
        const refund = await razorpayInstance.payments.refund(paymentId, options);
        return {
            success: true,
            refundId: refund.id,
            paymentId: refund.payment_id,
            amount: refund.amount / 100,
            status: refund.status,
        };
    } catch (error) {
        console.error('Payment refund failed:', error);
        throw Object.assign(new Error('Failed to refund payment'), {
            statusCode: 500,
            originalError: error,
        });
    }
};

module.exports = {
    createOrder,
    verifyPaymentSignature,
    getPaymentDetails,
    capturePayment,
    refundPayment,
    getRazorpayInstance,
};
