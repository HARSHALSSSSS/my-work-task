const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { sendSuccess, sendCreated, sendNotFound, sendError } = require('../../../../shared/utils/response');
const { paginate, paginateMeta } = require('../../../../shared/utils/pagination');
const AuditLog = require('../models/audit-log.model');
const config = require('../config');

// Staff Dashboard API
const getStaffDashboard = async (req, res, next) => {
    try {
        const { role = 'ops' } = req.query;
        
        // Return empty dashboard data - no mock data
        const dashboardData = {
            kpis: [],
            tasks: [],
            alerts: []
        };

        return sendSuccess(res, dashboardData, 'Dashboard data retrieved successfully');
    } catch (err) {
        next(err);
    }
};

const getAuthConn = async () => {
    const existing = mongoose.connections.find(
        (c) => c.name === 'speedcopy_auth' && c.readyState === 1
    );
    if (existing) return existing;
    return mongoose
        .createConnection(config.getDbUri('auth'), { family: 4, serverSelectionTimeoutMS: 5000 })
        .asPromise();
};

const getStaff = async (req, res, next) => {
    try {
        const conn = await getAuthConn();
        const { page, limit, skip } = paginate(req.query);
        const filter = { role: { $in: ['admin', 'staff'] } };
        if (req.query.team) filter['staffProfile.team'] = req.query.team;

        const [staff, total] = await Promise.all([
            conn.db
                .collection('users')
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            conn.db.collection('users').countDocuments(filter),
        ]);

        return sendSuccess(res, { staff, meta: paginateMeta(total, page, limit) });
    } catch (err) {
        next(err);
    }
};

const createStaff = async (req, res, next) => {
    try {
        const conn = await getAuthConn();
        const { name, email, password, role, phone, permissions = [], team = 'ops', scopes = [] } = req.body;
        const normalizedEmail = String(email || '').trim().toLowerCase();
        if (!name || !normalizedEmail || !password) {
            return sendError(res, 'Name, email, and password are required', 400);
        }

        const existing = await conn.db.collection('users').findOne({ email: normalizedEmail });
        if (existing) {
            return sendError(res, 'A user already exists with this email', 409);
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const result = await conn.db.collection('users').insertOne({
            name,
            email: normalizedEmail,
            password: hashedPassword,
            phone,
            role: role || 'staff',
            isActive: true,
            staffProfile: {
                team,
                permissions,
                scopes,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        await AuditLog.create({
            actorId: req.headers['x-user-id'] || '',
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.staff.create',
            targetType: 'staff',
            targetId: String(result.insertedId),
            metadata: { role: role || 'staff', team, permissions, scopes },
        });
        return sendCreated(
            res,
            {
                _id: result.insertedId,
                loginCredentials: {
                    email: normalizedEmail,
                    password,
                },
            },
            'Staff created'
        );
    } catch (err) {
        next(err);
    }
};

const updateStaffRole = async (req, res, next) => {
    try {
        const conn = await getAuthConn();
        const { role, permissions, scopes, team } = req.body;
        const update = { role, updatedAt: new Date() };
        if (permissions || scopes || team) {
            update.staffProfile = {
                ...(team ? { team } : {}),
                ...(permissions ? { permissions } : {}),
                ...(scopes ? { scopes } : {}),
            };
        }
        await conn.db
            .collection('users')
            .updateOne(
                { _id: new mongoose.Types.ObjectId(req.params.id) },
                { $set: update }
            );
        await AuditLog.create({
            actorId: req.headers['x-user-id'] || '',
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.staff.update_role',
            targetType: 'staff',
            targetId: req.params.id,
            metadata: { role, permissions, scopes, team },
        });
        return sendSuccess(res, null, 'Role updated');
    } catch (err) {
        next(err);
    }
};

const updateStaffStatus = async (req, res, next) => {
    try {
        const conn = await getAuthConn();
        const { isActive = true, reason } = req.body;
        const result = await conn.db
            .collection('users')
            .updateOne(
                { _id: new mongoose.Types.ObjectId(req.params.id), role: { $in: ['admin', 'staff'] } },
                {
                    $set: {
                        isActive: Boolean(isActive),
                        status: isActive ? 'active' : 'inactive',
                        suspendedReason: isActive ? null : reason,
                        updatedAt: new Date(),
                    },
                }
            );

        if (!result.matchedCount) {
            return sendNotFound(res, 'Staff member not found');
        }

        await AuditLog.create({
            actorId: req.headers['x-user-id'] || '',
            actorRole: req.headers['x-user-role'] || 'admin',
            action: isActive ? 'admin.staff.activate' : 'admin.staff.deactivate',
            targetType: 'staff',
            targetId: req.params.id,
            reason,
        });

        return sendSuccess(res, { id: req.params.id, isActive: Boolean(isActive) }, `Staff member ${isActive ? 'activated' : 'deactivated'}`);
    } catch (err) {
        next(err);
    }
};

const deleteStaff = async (req, res, next) => {
    try {
        const conn = await getAuthConn();
        const result = await conn.db
            .collection('users')
            .deleteOne({ _id: new mongoose.Types.ObjectId(req.params.id), role: { $in: ['admin', 'staff'] } });

        if (!result.deletedCount) {
            return sendNotFound(res, 'Staff member not found');
        }

        await AuditLog.create({
            actorId: req.headers['x-user-id'] || '',
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.staff.delete',
            targetType: 'staff',
            targetId: req.params.id,
        });

        return sendSuccess(res, null, 'Staff member deleted');
    } catch (err) {
        next(err);
    }
};

module.exports = { getStaff, createStaff, updateStaffRole, updateStaffStatus, deleteStaff, getStaffDashboard };
