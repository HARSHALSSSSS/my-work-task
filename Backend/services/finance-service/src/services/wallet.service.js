const crypto = require('crypto');
const Wallet = require('../models/wallet.model');
const Ledger = require('../models/ledger.model');
const { paginate, paginateMeta } = require('../../../../shared/utils/pagination');
const config = require('../config');

const isProduction = (process.env.NODE_ENV || 'development') === 'production';
const buildMockRazorpayOrderId = (amountInPaise) =>
    `order_mock_${amountInPaise}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const buildMockRazorpayPaymentId = () =>
    `pay_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const isMockRazorpayPayload = (orderId, paymentId, signature) =>
    String(orderId || '').startsWith('order_mock_') ||
    String(paymentId || '').startsWith('pay_mock_') ||
    signature === 'mock_signature_verified';
const getAmountFromMockOrderId = (orderId) => {
    const match = String(orderId || '').match(/^order_mock_(\d+)_/);
    return match ? Number(match[1]) : 0;
};
const createRazorpayOrderViaRest = async ({ keyId, keySecret, amount, currency, receipt, notes = {} }) => {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            amount,
            currency,
            receipt,
            notes,
        }),
    });

    const text = await response.text();
    let payload = null;
    try {
        payload = text ? JSON.parse(text) : null;
    } catch {
        payload = { raw: text };
    }

    if (!response.ok) {
        const error = new Error(
            payload?.error?.description ||
            payload?.description ||
            payload?.message ||
            `Razorpay order creation failed with status ${response.status}`
        );
        error.statusCode = response.status;
        error.details = payload;
        throw error;
    }

    return payload;
};

const getOrCreateWallet = async (userId, userType = 'customer') => {
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) wallet = await Wallet.create({ userId, userType });
    return wallet;
};

const getWallet = async (userId) => {
    return getOrCreateWallet(userId);
};

const TOPUP_PRESETS = [50, 100, 500, 1000];
const SUPPORTED_PAYMENT_METHODS = [
    { id: 'google_pay', name: 'Google Pay', type: 'upi' },
    { id: 'phonepe', name: 'PhonePe', type: 'upi' },
    { id: 'upi', name: 'UPI', type: 'upi' },
    { id: 'paytm', name: 'Paytm', type: 'upi' },
    { id: 'card', name: 'Credit/Debit Card', type: 'card' },
    { id: 'netbanking', name: 'Net Banking', type: 'netbanking' },
    { id: 'wallet', name: 'Digital Wallet', type: 'wallet' },
    { id: 'bnpl', name: 'Buy Now Pay Later', type: 'bnpl' },
];

const getLedger = async (userId, query) => {
    const wallet = await getOrCreateWallet(userId);
    const { page, limit, skip } = paginate(query);
    const filter = { walletId: wallet._id };
    if (query.category) filter.category = query.category;

    const [entries, total] = await Promise.all([
        Ledger.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Ledger.countDocuments(filter),
    ]);

    return { wallet, entries, meta: paginateMeta(total, page, limit) };
};

const getWalletOverview = async (userId) => {
    const wallet = await getOrCreateWallet(userId);
    const recentEntries = await Ledger.find({ walletId: wallet._id }).sort({ createdAt: -1 }).limit(5);

    return {
        wallet,
        recent_entries: recentEntries,
        topup_presets: TOPUP_PRESETS,
        payment_methods: SUPPORTED_PAYMENT_METHODS,
    };
};

const getTopupConfig = async () => ({
    currency: 'INR',
    min_amount: 10,
    max_amount: 50000,
    topup_presets: TOPUP_PRESETS,
    payment_methods: SUPPORTED_PAYMENT_METHODS,
    processing_fee_pct: 0,
});

const previewTopup = async (amount) => {
    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount < 10) {
        throw Object.assign(new Error('Minimum topup amount is 10'), { statusCode: 400 });
    }

    const processingFee = 0;
    return {
        amount: normalizedAmount,
        processing_fee: processingFee,
        total_payable: normalizedAmount + processingFee,
        currency: 'INR',
    };
};

/**
 * Credit or debit wallet atomically.
 * Returns updated wallet + ledger entry.
 */
const transact = async (
    userId,
    { type, category, amount, referenceId, referenceType, description, metadata }
) => {
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) throw Object.assign(new Error('Wallet not found'), { statusCode: 404 });

    if (type === 'debit' && wallet.balance < amount) {
        throw Object.assign(new Error('Insufficient wallet balance'), { statusCode: 400 });
    }

    const balanceBefore = wallet.balance;
    wallet.balance = type === 'credit' ? balanceBefore + amount : balanceBefore - amount;
    await wallet.save();

    const entry = await Ledger.create({
        walletId: wallet._id,
        userId,
        type,
        category,
        amount,
        balanceBefore,
        balanceAfter: wallet.balance,
        referenceId,
        referenceType,
        description,
        metadata,
    });

    return { wallet, entry };
};

const getDeliveryEarningsSummary = async (userId) => {
    const wallet = await getOrCreateWallet(userId, 'delivery_partner');
    const entries = await Ledger.find({
        walletId: wallet._id,
        category: { $in: ['delivery_earning', 'payout', 'admin_credit'] },
    })
        .sort({ createdAt: -1 })
        .limit(25);

    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(dayStart);
    weekStart.setDate(dayStart.getDate() - 6);

    const summary = entries.reduce(
        (accumulator, entry) => {
            const createdAt = new Date(entry.createdAt);
            if (entry.type === 'credit') {
                accumulator.total += entry.amount;
                if (createdAt >= dayStart) accumulator.today += entry.amount;
                if (createdAt >= weekStart) accumulator.week += entry.amount;
            }
            return accumulator;
        },
        { today: 0, week: 0, total: 0 }
    );

    return {
        wallet,
        summary,
        recent_jobs: entries.map((entry) => ({
            id: entry._id,
            amount: entry.amount,
            category: entry.category,
            referenceId: entry.referenceId || '',
            description: entry.description || '',
            createdAt: entry.createdAt,
        })),
    };
};

const addFunds = async (userId, amount, paymentMethod) => {
    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount < 10) {
        throw Object.assign(new Error('Minimum topup amount is 10'), { statusCode: 400 });
    }

    const wallet = await getOrCreateWallet(userId);
    const balanceBefore = wallet.balance;
    wallet.balance = balanceBefore + normalizedAmount;
    await wallet.save();

    const entry = await Ledger.create({
        walletId: wallet._id,
        userId,
        type: 'credit',
        category: 'wallet_topup',
        amount: normalizedAmount,
        balanceBefore,
        balanceAfter: wallet.balance,
        referenceType: 'payment',
        description: `Wallet topup via ${paymentMethod}`,
        metadata: { paymentMethod },
    });

    return {
        success: true,
        message: 'Funds added successfully',
        wallet,
        entry,
    };
};

/**
 * Initiate Razorpay payment for wallet topup.
 * Creates payment order directly using Razorpay SDK.
 */
const initiateRazorpayPayment = async (userId, { orderId, amount, currency = 'INR' } = {}) => {
    if (!orderId || !amount) {
        throw Object.assign(new Error('Missing required fields: orderId and amount'), { statusCode: 400 });
    }

    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount < 10) {
        throw Object.assign(new Error('Minimum topup amount is 10'), { statusCode: 400 });
    }

    try {
        const keyId = config.razorpay.keyId;
        const keySecret = config.razorpay.keySecret;
        
        const isMock = !keyId || keyId === 'your_razorpay_key_id';

        if (isMock) {
            // Mock mode - return fake Razorpay order
            const amountInPaise = Math.round(normalizedAmount * 100);
            const mockRzpOrderId = buildMockRazorpayOrderId(amountInPaise);
            
            return {
                success: true,
                data: {
                    razorpayOrderId: mockRzpOrderId,
                    amount: amountInPaise,
                    currency,
                    keyId: 'mock_key_id',
                    mock: true,
                    note: 'MOCK MODE — use verifyPayment with any razorpayPaymentId to simulate success',
                }
            };
        }

        const amountInPaise = Math.round(normalizedAmount * 100);
        const rzpOrder = await createRazorpayOrderViaRest({
            keyId,
            keySecret,
            amount: amountInPaise,
            currency,
            receipt: orderId,
            notes: {
                userId,
                purpose: 'wallet_topup',
            },
        });

        return {
            success: true,
            data: {
                razorpayOrderId: rzpOrder.id,
                amount: rzpOrder.amount,
                currency,
                keyId: keyId,
            }
        };
    } catch (err) {
        console.error('[Finance] Payment initiation failed:', err);
        const upstreamStatus = err?.statusCode || err?.status;
        const canFallbackToMock = !isProduction && (!config.razorpay.keyId || config.razorpay.keyId === 'your_razorpay_key_id');
        if (canFallbackToMock) {
            const amountInPaise = Math.round(normalizedAmount * 100);
            const mockRzpOrderId = buildMockRazorpayOrderId(amountInPaise);
            console.warn('[Finance] Falling back to mock Razorpay order in development mode');
            return {
                success: true,
                data: {
                    razorpayOrderId: mockRzpOrderId,
                    amount: amountInPaise,
                    currency,
                    keyId: 'mock_key_id',
                    mock: true,
                    note: 'DEV FALLBACK - Razorpay order creation failed, using mock checkout flow',
                },
            };
        }
        if (upstreamStatus === 401) {
            throw Object.assign(
                new Error('Razorpay test/live credentials were rejected. Please verify the configured keys.'),
                { statusCode: 502 }
            );
        }
        throw Object.assign(
            new Error(err.message || 'Failed to initiate Razorpay payment'),
            { statusCode: upstreamStatus || 500 }
        );
    }
};

/**
 * Verify Razorpay payment and credit wallet.
 * Delegates to payment service for signature verification.
 */
const verifyRazorpayPayment = async (userId, body = {}) => {
    try {
        // Safely extract fields from body
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId, paymentId, signature } = body || {};
        
        // Use provided fields or fallback to alternative names
        const finalOrderId = razorpayOrderId || orderId;
        const finalPaymentId = razorpayPaymentId || paymentId;
        const finalSignature = razorpaySignature || signature;

        if (!finalOrderId || !finalPaymentId || !finalSignature) {
            throw Object.assign(
                new Error('Missing required payment verification fields: razorpayOrderId, razorpayPaymentId, and razorpaySignature are required'),
                { statusCode: 400 }
            );
        }

        if (isMockRazorpayPayload(finalOrderId, finalPaymentId, finalSignature)) {
            const amountInPaise = getAmountFromMockOrderId(finalOrderId);
            const amountInRupees = amountInPaise / 100;

            if (!amountInRupees) {
                throw Object.assign(
                    new Error('Mock payment amount could not be determined'),
                    { statusCode: 400 }
                );
            }

            const wallet = await getOrCreateWallet(userId);
            const balanceBefore = wallet.balance;
            wallet.balance = balanceBefore + amountInRupees;
            await wallet.save();

            const entry = await Ledger.create({
                walletId: wallet._id,
                userId,
                type: 'credit',
                category: 'wallet_topup',
                amount: amountInRupees,
                balanceBefore,
                balanceAfter: wallet.balance,
                referenceId: finalPaymentId || buildMockRazorpayPaymentId(),
                referenceType: 'razorpay_payment',
                description: `Wallet topup via Razorpay mock flow (Order: ${finalOrderId})`,
                metadata: {
                    razorpayOrderId: finalOrderId,
                    razorpayPaymentId: finalPaymentId,
                    mock: true,
                },
            });

            return {
                success: true,
                message: 'Mock payment verified and wallet credited',
                wallet,
                entry,
                data: {
                    wallet,
                    entry,
                },
            };
        }

        const keySecret = config.razorpay.keySecret;
        if (!keySecret || keySecret === 'your_razorpay_key_secret') {
            throw Object.assign(
                new Error('Razorpay key secret is not configured for payment verification'),
                { statusCode: 502 }
            );
        }

        const signaturePayload = `${finalOrderId}|${finalPaymentId}`;
        const expectedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(signaturePayload)
            .digest('hex');

        if (expectedSignature !== finalSignature) {
            throw Object.assign(
                new Error('Payment verification failed - invalid signature'),
                { statusCode: 400 }
            );
        }

        const amountInPaise = Number(body.amount) || 0;
        if (!amountInPaise) {
            throw Object.assign(
                new Error('Payment amount is required to credit wallet after verification'),
                { statusCode: 400 }
            );
        }

        const amountInRupees = amountInPaise / 100;

        // Credit wallet
        const wallet = await getOrCreateWallet(userId);
        const balanceBefore = wallet.balance;
        wallet.balance = balanceBefore + amountInRupees;
        await wallet.save();

        // Create ledger entry
        const entry = await Ledger.create({
            walletId: wallet._id,
            userId,
            type: 'credit',
            category: 'wallet_topup',
            amount: amountInRupees,
            balanceBefore,
            balanceAfter: wallet.balance,
            referenceId: finalPaymentId,
            referenceType: 'razorpay_payment',
            description: `Wallet topup via Razorpay (Order: ${finalOrderId})`,
            metadata: {
                razorpayOrderId: finalOrderId,
                razorpayPaymentId: finalPaymentId,
            },
        });

        return {
            success: true,
            message: 'Payment verified and wallet credited',
            wallet,
            entry,
            data: {
                wallet,
                entry,
            },
        };
    } catch (err) {
        console.error('[Finance] Payment verification failed:', err);
        const upstreamStatus = err?.statusCode || err?.status;
        if (upstreamStatus === 401) {
            throw Object.assign(
                new Error('Payment verification could not be completed right now. Please contact support if amount was debited.'),
                { statusCode: 502 }
            );
        }
        throw Object.assign(
            new Error(err.message || 'Failed to verify payment'),
            { statusCode: upstreamStatus || 500 }
        );
    }
};

module.exports = {
    getWallet,
    getWalletOverview,
    getTopupConfig,
    previewTopup,
    getLedger,
    transact,
    getOrCreateWallet,
    getDeliveryEarningsSummary,
    addFunds,
    initiateRazorpayPayment,
    verifyRazorpayPayment,
};
