const mongoose = require('mongoose');
const { sendSuccess, sendError } = require('../../../../shared/utils/response');
const { paginate, paginateMeta } = require('../../../../shared/utils/pagination');
const AuditLog = require('../models/audit-log.model');

const extraConnections = {};

const getAuthConn = async () => {
    const uri = process.env.AUTH_DB_URI || 'mongodb://127.0.0.1:27017/speedcopy_auth';
    const existing = mongoose.connections.find(
        (c) => c.name === 'speedcopy_auth' && c.readyState === 1
    );
    if (existing) return existing;
    return mongoose
        .createConnection(uri, { family: 4, serverSelectionTimeoutMS: 5000 })
        .asPromise();
};

const getNamedConn = async (name, uri) => {
    const existing =
        extraConnections[name] ||
        mongoose.connections.find((connection) => connection.name === name && connection.readyState === 1);
    if (existing) {
        extraConnections[name] = existing;
        return existing;
    }
    const created = await mongoose
        .createConnection(uri, { family: 4, serverSelectionTimeoutMS: 5000 })
        .asPromise();
    extraConnections[name] = created;
    return created;
};

const getCustomers = async (req, res, next) => {
    try {
        const conn = await getAuthConn();
        const { page, limit, skip } = paginate(req.query);
        const filter = { role: 'user' };
        if (req.query.search) {
            filter.$or = [
                { name: { $regex: req.query.search, $options: 'i' } },
                { email: { $regex: req.query.search, $options: 'i' } },
            ];
        }
        if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

        const [customers, total] = await Promise.all([
            conn.db
                .collection('users')
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            conn.db.collection('users').countDocuments(filter),
        ]);

        return sendSuccess(res, { customers, meta: paginateMeta(total, page, limit) });
    } catch (err) {
        next(err);
    }
};

const getCustomer = async (req, res, next) => {
    try {
        const conn = await getAuthConn();
        const authId = new mongoose.Types.ObjectId(req.params.id);
        const userConn = await getNamedConn(
            'speedcopy_users',
            process.env.USER_DB_URI || 'mongodb://127.0.0.1:27017/speedcopy_users'
        );
        const financeConn = await getNamedConn(
            'speedcopy_finance',
            process.env.FINANCE_DB_URI || 'mongodb://127.0.0.1:27017/speedcopy_finance'
        );
        const orderConn = await getNamedConn(
            'speedcopy_orders',
            process.env.ORDER_DB_URI || 'mongodb://127.0.0.1:27017/speedcopy_orders'
        );
        
        const [customer, profile, addresses, wallet, orders] = await Promise.all([
            conn.db.collection('users').findOne({ _id: authId }),
            userConn.db.collection('profiles').findOne({ userId: req.params.id }),
            userConn.db.collection('addresses').find({ userId: req.params.id }).toArray(),
            financeConn.db.collection('wallets').findOne({ userId: req.params.id }),
            orderConn.db.collection('orders').find({ userId: req.params.id }).sort({ createdAt: -1 }).limit(10).toArray(),
        ]);
        
        if (!customer) return sendError(res, 'Customer not found', 404);
        
        // Structure the response to match frontend expectations
        const customerDetail = {
            id: customer._id.toString(),
            name: customer.name || 'Unknown',
            email: customer.email || '',
            phone: customer.phone || '',
            status: customer.isActive !== false ? 'active' : 'restricted',
            joinedDate: customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'N/A',
            riskScore: customer.riskScore || 0,
            lifetimeValue: wallet?.totalAdded || 0,
            orders: {
                total: orders.length || 0,
                completed: orders.filter(o => o.status === 'completed').length || 0,
                avgOrderValue: orders.length > 0 ? Math.round(orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0) / orders.length) : 0,
                recentOrders: orders.map(o => ({
                    id: o._id.toString(),
                    date: o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'N/A',
                    amount: o.totalAmount || 0,
                    status: o.status || 'pending',
                    type: o.type || 'order',
                })) || [],
            },
            wallet: {
                balance: wallet?.balance || 0,
                totalSpent: wallet?.totalSpent || 0,
                refundsReceived: wallet?.refundsReceived || 0,
                transactions: wallet?.transactions?.map(t => ({
                    id: t._id?.toString() || Math.random().toString(),
                    date: t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A',
                    amount: t.amount || 0,
                    type: t.type || 'transaction',
                    description: t.description || '',
                    balance: t.balanceAfter || 0,
                })) || [],
            },
            support: {
                ticketsRaised: 0,
                openTickets: 0,
                avgResolutionTime: 0,
                tickets: [],
            },
            activityLog: [
                {
                    timestamp: customer.createdAt ? new Date(customer.createdAt).toLocaleString() : 'N/A',
                    action: 'Account created',
                    type: 'account',
                },
            ],
        };
        
        return sendSuccess(res, customerDetail);
    } catch (err) {
        next(err);
    }
};

const restrictCustomer = async (req, res, next) => {
    try {
        const conn = await getAuthConn();
        const { isActive, reason } = req.body;
        await conn.db
            .collection('users')
            .updateOne(
                { _id: new mongoose.Types.ObjectId(req.params.id) },
                { $set: { isActive, restrictedReason: reason, updatedAt: new Date() } }
            );
        await AuditLog.create({
            actorId: req.headers['x-user-id'] || '',
            actorRole: req.headers['x-user-role'] || 'admin',
            action: isActive ? 'admin.customers.activate' : 'admin.customers.restrict',
            targetType: 'customer',
            targetId: req.params.id,
            reason,
        });
        return sendSuccess(res, null, `Customer ${isActive ? 'activated' : 'restricted'}`);
    } catch (err) {
        next(err);
    }
};

module.exports = { getCustomers, getCustomer, restrictCustomer };
