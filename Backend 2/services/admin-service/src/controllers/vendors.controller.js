const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { sendSuccess, sendError } = require('../../../../shared/utils/response');
const { paginate, paginateMeta } = require('../../../../shared/utils/pagination');
const AuditLog = require('../models/audit-log.model');
const config = require('../config');

const getVendorConn = async () => {
    const existing = mongoose.connections.find(
        (c) => c.name === 'speedcopy_vendors' && c.readyState === 1
    );
    if (existing) return existing;
    return mongoose
        .createConnection(config.getDbUri('vendor'), { family: 4, serverSelectionTimeoutMS: 5000 })
        .asPromise();
};

const getAuthConn = async () => {
    const existing = mongoose.connections.find((c) => c.name === 'speedcopy_auth' && c.readyState === 1);
    if (existing) return existing;
    return mongoose
        .createConnection(config.getDbUri('auth'), { family: 4, serverSelectionTimeoutMS: 5000 })
        .asPromise();
};

const getVendors = async (req, res, next) => {
    try {
        const conn = await getVendorConn();
        const { page, limit, skip } = paginate(req.query);
        const filter = { deletedAt: null };
        if (req.query.isApproved !== undefined) filter.isApproved = req.query.isApproved === 'true';
        if (req.query.isSuspended !== undefined)
            filter.isSuspended = req.query.isSuspended === 'true';

        const [vendors, total] = await Promise.all([
            conn.db
                .collection('vendororgs')
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            conn.db.collection('vendororgs').countDocuments(filter),
        ]);

        return sendSuccess(res, { vendors, meta: paginateMeta(total, page, limit) });
    } catch (err) {
        next(err);
    }
};

const getVendor = async (req, res, next) => {
    try {
        const conn = await getVendorConn();
        const vendorId = new mongoose.Types.ObjectId(req.params.id);
        const [vendor, stores, staff] = await Promise.all([
            conn.db.collection('vendororgs').findOne({ _id: vendorId }),
            conn.db.collection('stores').find({ vendorId: req.params.id, deletedAt: null }).toArray(),
            conn.db.collection('vendorstaffs').find({ vendorId: req.params.id, deletedAt: null }).toArray(),
        ]);
        if (!vendor) return sendError(res, 'Vendor not found', 404);
        return sendSuccess(res, {
            ...vendor,
            stores,
            staff,
            stats: {
                totalStores: stores.length,
                activeStores: stores.filter((store) => store.isActive).length,
                activeStaff: staff.filter((member) => member.isActive).length,
            },
        });
    } catch (err) {
        next(err);
    }
};

const suspendVendor = async (req, res, next) => {
    try {
        const conn = await getVendorConn();
        const { reason, isSuspended = true } = req.body;
        await conn.db
            .collection('vendororgs')
            .updateOne(
                { _id: new mongoose.Types.ObjectId(req.params.id) },
                {
                    $set: {
                        isSuspended,
                        suspendedReason: reason,
                        updatedAt: new Date(),
                    },
                }
            );
        await AuditLog.create({
            actorId: req.headers['x-user-id'] || '',
            actorRole: req.headers['x-user-role'] || 'admin',
            action: isSuspended ? 'admin.vendors.suspend' : 'admin.vendors.resume',
            targetType: 'vendor',
            targetId: req.params.id,
            reason,
        });
        return sendSuccess(res, null, `Vendor ${isSuspended ? 'suspended' : 'resumed'}`);
    } catch (err) {
        next(err);
    }
};

const setPriority = async (req, res, next) => {
    try {
        const conn = await getVendorConn();
        const { priority } = req.body;
        await conn.db
            .collection('vendororgs')
            .updateOne(
                { _id: new mongoose.Types.ObjectId(req.params.id) },
                { $set: { priority, updatedAt: new Date() } }
            );
        await AuditLog.create({
            actorId: req.headers['x-user-id'] || '',
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.vendors.priority_updated',
            targetType: 'vendor',
            targetId: req.params.id,
            metadata: { priority },
        });
        return sendSuccess(res, null, 'Priority updated');
    } catch (err) {
        next(err);
    }
};

const createVendor = async (req, res, next) => {
    try {
        const conn = await getVendorConn();
        const authConn = await getAuthConn();
        const { name, email, phone, password, location, tier = 'bronze' } = req.body;
        const normalizedEmail = String(email || '').trim().toLowerCase();

        if (!name || !normalizedEmail || !phone || !password) {
            return sendError(res, 'Name, email, phone, and password are required', 400);
        }

        const existingAuthUser = await authConn.db.collection('users').findOne({ email: normalizedEmail });
        if (existingAuthUser) {
            return sendError(res, 'A login account already exists with this email', 409);
        }

        const existingVendor = await conn.db.collection('vendororgs').findOne({
            $or: [{ email: normalizedEmail }, { phone }],
            deletedAt: null,
        });
        if (existingVendor) {
            return sendError(res, 'Vendor already exists with this email or phone', 409);
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const authUser = {
            name,
            email: normalizedEmail,
            password: hashedPassword,
            phone,
            role: 'vendor',
            isActive: true,
            isEmailVerified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const authResult = await authConn.db.collection('users').insertOne(authUser);
        const vendorUserId = authResult.insertedId.toString();

        const newVendor = {
            userId: vendorUserId,
            name,
            email: normalizedEmail,
            phone,
            location: location || '',
            tier,
            isApproved: true,
            isSuspended: false,
            priority: 1,
            healthScore: 100,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
        };

        const result = await conn.db.collection('vendororgs').insertOne(newVendor);

        // Create audit log (non-blocking)
        try {
            await AuditLog.create({
                actorId: req.headers['x-user-id'] || '',
                actorRole: req.headers['x-user-role'] || 'admin',
                action: 'admin.vendors.created',
                targetType: 'vendor',
                targetId: result.insertedId.toString(),
                metadata: { name, email },
            });
        } catch (auditErr) {
            console.error('Failed to create audit log:', auditErr);
            // Don't fail the request if audit log fails
        }

        return sendSuccess(
            res,
            {
                ...newVendor,
                _id: result.insertedId,
                loginCredentials: {
                    email: normalizedEmail,
                    password,
                },
            },
            'Vendor created successfully',
            201
        );
    } catch (err) {
        next(err);
    }
};

module.exports = { getVendors, getVendor, createVendor, suspendVendor, setPriority };
