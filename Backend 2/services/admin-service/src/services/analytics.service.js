const mongoose = require('mongoose');
const config = require('../config');

/**
 * Admin service connects to each service's own database to aggregate stats.
 * Uses separate mongoose connections per database.
 */

// Create separate connections for each service DB
const connections = {};

const getConn = async (connectionKey, serviceName) => {
    if (connections[connectionKey] && connections[connectionKey].readyState === 1) {
        return connections[connectionKey];
    }

    const uri = config.getDbUri(serviceName);
    const conn = await mongoose
        .createConnection(uri, {
            serverSelectionTimeoutMS: 5000,
            family: 4,
        })
        .asPromise();
    connections[connectionKey] = conn;
    return conn;
};

const getDashboardStats = async () => {
    const [authConn, orderConn, productConn] = await Promise.all([
        getConn('speedcopy_auth', 'auth'),
        getConn('speedcopy_orders', 'order'),
        getConn('speedcopy_products', 'product'),
    ]);

    const [totalUsers, totalOrders, totalProducts, recentOrders, ordersByStatus, revenueData] =
        await Promise.all([
            authConn.db.collection('users').countDocuments(),
            orderConn.db.collection('orders').countDocuments(),
            productConn.db.collection('products').countDocuments({ isActive: true }),
            orderConn.db.collection('orders').find({}).sort({ createdAt: -1 }).limit(5).toArray(),
            orderConn.db
                .collection('orders')
                .aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
                .toArray(),
            orderConn.db
                .collection('orders')
                .aggregate([
                    { $match: { paymentStatus: 'paid' } },
                    { $group: { _id: null, total: { $sum: '$total' } } },
                ])
                .toArray(),
        ]);

    return {
        totalUsers,
        totalOrders,
        totalProducts,
        totalRevenue: revenueData[0]?.total || 0,
        recentOrders,
        ordersByStatus: ordersByStatus.reduce((acc, s) => {
            acc[s._id] = s.count;
            return acc;
        }, {}),
    };
};

module.exports = { getDashboardStats };
