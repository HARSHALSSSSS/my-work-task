const config = require('../config');

const buildHeaders = (req, { auth = false } = {}) => {
    const headers = {
        'Content-Type': 'application/json',
    };

    if (req.headers['x-user-id']) headers['x-user-id'] = req.headers['x-user-id'];
    if (req.headers['x-user-role']) headers['x-user-role'] = req.headers['x-user-role'];
    if (req.headers['x-user-email']) headers['x-user-email'] = req.headers['x-user-email'];
    if (req.headers['x-user-permissions']) {
        headers['x-user-permissions'] = req.headers['x-user-permissions'];
    }
    if (req.headers['x-firebase-uid']) headers['x-firebase-uid'] = req.headers['x-firebase-uid'];
    if (auth && req.headers.authorization) headers.Authorization = req.headers.authorization;

    return headers;
};

const requestJson = async (url, options = {}) => {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
        const error = new Error(payload?.message || `Service request failed: ${response.status}`);
        error.status = response.status || 500;
        error.statusCode = response.status || 500;
        throw error;
    }

    return payload.data;
};

const safeRequestJson = async (url, options = {}, fallback = null) => {
    try {
        return await requestJson(url, options);
    } catch {
        return fallback;
    }
};

const PUBLIC_HOME_CONTENT = {
    hero: {
        eyebrow: 'Fast. Transparent. Delivered.',
        title: 'Print Smarter. Delivered Faster.',
        subtitle:
            'Upload, customize, and get high-quality prints delivered to your door or ready for pickup.',
        primary_cta: { label: 'Start Printing', route: '/printing' },
        secondary_cta: { label: 'Explore Services', route: '/services' },
    },
    promo_cards: [
        {
            id: 'refer_friend',
            title: 'Give 10, Get 10',
            description: 'Invite friends to SpeedCopy. They get a discount, you get credit.',
            route: '/refer',
        },
    ],
    trust_stats: [
        { id: 'happy_customers', label: 'Happy Customers', value: '30,000+' },
        { id: 'orders_delivered', label: 'Orders Delivered', value: '50,000+' },
        { id: 'papers_printed', label: 'Papers Printed', value: '30,00,000+' },
    ],
    testimonials: [
        {
            id: 't1',
            author: 'Sarah Jenkins',
            text: 'Amazing quality and fast delivery. The custom mug I ordered was perfect.',
        },
        {
            id: 't2',
            author: 'Michael Chen',
            text: 'Business cards arrived on time and the print finish was exactly what we needed.',
        },
        {
            id: 't3',
            author: 'Emily Rodriguez',
            text: 'Order tracking was smooth and support was helpful when I needed changes.',
        },
    ],
};

const HELP_CENTER_CONTENT = {
    hero: {
        title: 'How can we help you?',
        subtitle: 'Search our knowledge base or browse categories below to find answers fast.',
    },
};

const getHome = async (req) => {
    const [shoppingHome, giftingHome, printingHome, businessPrintingHome] = await Promise.all([
        safeRequestJson(`${config.services.product}/api/shop/home`, { headers: buildHeaders(req) }, {}),
        safeRequestJson(`${config.services.product}/api/gifting/home`, { headers: buildHeaders(req) }, {}),
        safeRequestJson(`${config.services.product}/api/printing/home`, { headers: buildHeaders(req) }, {}),
        safeRequestJson(
            `${config.services.product}/api/business-printing/home`,
            { headers: buildHeaders(req) },
            {}
        ),
    ]);

    return {
        ...PUBLIC_HOME_CONTENT,
        sections: [
            {
                id: 'printing',
                name: 'Printing',
                description: 'Documents, flyers, business cards, and binding.',
                route: '/printing',
                meta: printingHome,
            },
            {
                id: 'gifting',
                name: 'Gifting',
                description: 'Mugs, shirts, frames, and custom gifts.',
                route: '/gifting',
                meta: giftingHome,
            },
            {
                id: 'shopping',
                name: 'Shopping',
                description: 'Office essentials and print-ready products.',
                route: '/shopping',
                meta: shoppingHome,
            },
        ],
        featured: {
            shopping: shoppingHome?.featured_products || [],
            gifting: giftingHome?.featured_products || [],
            business_printing: businessPrintingHome?.featured_products || [],
        },
    };
};

const getSidebar = async (req) => {
    const headers = buildHeaders(req);
    const authHeaders = buildHeaders(req, { auth: true });

    const [authMe, userProfile, walletOverview, referralSummary, orderSummary, addresses, notificationSummary] =
        await Promise.all([
            requestJson(`${config.services.auth}/api/auth/me`, { headers: authHeaders }),
            safeRequestJson(`${config.services.user}/api/users/profile`, { headers }, {}),
            safeRequestJson(`${config.services.finance}/api/wallet/overview`, { headers }, {}),
            safeRequestJson(`${config.services.finance}/api/referrals/summary`, { headers }, {}),
            safeRequestJson(`${config.services.order}/api/orders/summary`, { headers }, {}),
            safeRequestJson(`${config.services.user}/api/users/addresses`, { headers }, []),
            safeRequestJson(`${config.services.notification}/api/notifications/summary`, { headers }, {}),
        ]);

    const authUser = authMe?.user || {};
    const defaultAddress = (addresses || []).find((address) => address.isDefault) || null;

    return {
        profile: {
            user_id: authUser._id || req.headers['x-user-id'],
            name: userProfile?.name || authUser.name || 'SpeedCopy User',
            email: authUser.email || req.headers['x-user-email'] || '',
            phone: userProfile?.phone || authUser.phone || '',
            avatar: userProfile?.avatar || authUser.photoURL || '',
            role: authUser.role || req.headers['x-user-role'] || 'user',
        },
        wallet: walletOverview?.wallet || null,
        orders: {
            active: orderSummary?.active_orders || 0,
            total: orderSummary?.total_orders || 0,
        },
        addresses: {
            total: addresses?.length || 0,
            default_address: defaultAddress,
        },
        notifications: notificationSummary,
        referrals: referralSummary?.totals || {},
    };
};

const getAccountProfile = async (req) => {
    const headers = buildHeaders(req);
    const authHeaders = buildHeaders(req, { auth: true });

    const [authMe, userProfile] = await Promise.all([
        requestJson(`${config.services.auth}/api/auth/me`, { headers: authHeaders }),
        safeRequestJson(`${config.services.user}/api/users/profile`, { headers }, {}),
    ]);

    return {
        auth: authMe?.user || {},
        profile: userProfile || {},
    };
};

const getAccountAddresses = async (req) => {
    const headers = buildHeaders(req);
    const addresses = await safeRequestJson(`${config.services.user}/api/users/addresses`, { headers }, []);

    return {
        total: addresses.length,
        default_address: addresses.find((address) => address.isDefault) || null,
        addresses,
    };
};

const getWalletPage = async (req) => {
    const headers = buildHeaders(req);
    const [overview, ledger, topupConfig] = await Promise.all([
        safeRequestJson(`${config.services.finance}/api/wallet/overview`, { headers }, {}),
        safeRequestJson(`${config.services.finance}/api/wallet/ledger?limit=10`, { headers }, {}),
        safeRequestJson(`${config.services.finance}/api/wallet/topup-config`, { headers }, {}),
    ]);

    return {
        overview,
        ledger,
        topup_config: topupConfig,
    };
};

const addWalletFunds = async (req) => {
    const headers = buildHeaders(req);

    return requestJson(`${config.services.finance}/api/wallet/add-funds`, {
        method: 'POST',
        headers,
        body: JSON.stringify(req.body || {}),
    });
};

const getReferralPage = async (req) => {
    const headers = buildHeaders(req);
    const [summary, history] = await Promise.all([
        safeRequestJson(`${config.services.finance}/api/referrals/summary`, { headers }, {}),
        safeRequestJson(`${config.services.finance}/api/referrals?limit=20`, { headers }, {}),
    ]);

    return {
        summary,
        history,
    };
};

const getOrdersPage = async (req) => {
    const headers = buildHeaders(req);
    const query = new URLSearchParams(req.query).toString();
    const suffix = query ? `?${query}` : '';
    const [summary, orders] = await Promise.all([
        safeRequestJson(`${config.services.order}/api/orders/summary`, { headers }, {}),
        safeRequestJson(`${config.services.order}/api/orders${suffix}`, { headers }, {}),
    ]);

    return {
        summary,
        orders,
    };
};

const getNotificationsPage = async (req) => {
    const headers = buildHeaders(req);
    const query = new URLSearchParams(req.query).toString();
    const suffix = query ? `?${query}` : '';
    const [summary, notifications] = await Promise.all([
        safeRequestJson(`${config.services.notification}/api/notifications/summary`, { headers }, {}),
        safeRequestJson(`${config.services.notification}/api/notifications${suffix}`, { headers }, {}),
    ]);

    return {
        summary,
        notifications,
    };
};

const getSupportPage = async (req) => {
    const headers = buildHeaders(req);
    const [helpCenter, ticketSummary, tickets] = await Promise.all([
        safeRequestJson(`${config.services.notification}/api/notifications/help-center`, { headers }, {}),
        safeRequestJson(`${config.services.notification}/api/notifications/tickets/summary`, { headers }, {}),
        safeRequestJson(`${config.services.notification}/api/notifications/tickets?limit=10`, { headers }, {}),
    ]);

    return {
        ...HELP_CENTER_CONTENT,
        help_center: helpCenter,
        ticket_summary: ticketSummary,
        tickets,
    };
};

module.exports = {
    getHome,
    getSidebar,
    getAccountProfile,
    getAccountAddresses,
    getWalletPage,
    addWalletFunds,
    getReferralPage,
    getOrdersPage,
    getNotificationsPage,
    getSupportPage,
};
