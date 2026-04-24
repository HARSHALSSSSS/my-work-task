const mongoose = require('mongoose');
const AuditLog = require('../models/audit-log.model');
const { sendSuccess, sendCreated, sendError } = require('../../../../shared/utils/response');
const { paginate, paginateMeta } = require('../../../../shared/utils/pagination');

// ─── Cross-DB Connection ──────────────────────────────────

const getOrderConn = async () => {
    const uri = process.env.ORDER_DB_URI || 'mongodb://127.0.0.1:27017/speedcopy_orders';
    const existing = mongoose.connections.find(
        (c) => c.name === 'speedcopy_orders' && c.readyState === 1
    );
    if (existing) return existing;
    return mongoose
        .createConnection(uri, { family: 4, serverSelectionTimeoutMS: 5000 })
        .asPromise();
};

// ─── GET /api/admin/coupons ───────────────────────────────

const getCoupons = async (req, res, next) => {
    try {
        const conn = await getOrderConn();
        const { page, limit, skip } = paginate(req.query);
        const filter = {};

        if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
        if (req.query.search) {
            filter.code = new RegExp(req.query.search, 'i');
        }

        const [coupons, total] = await Promise.all([
            conn.db
                .collection('coupons')
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            conn.db.collection('coupons').countDocuments(filter),
        ]);

        return sendSuccess(res, { coupons, meta: paginateMeta(total, page, limit) });
    } catch (err) {
        next(err);
    }
};

// ─── POST /api/admin/coupons ──────────────────────────────

const createCoupon = async (req, res, next) => {
    try {
        const {
            code, description, discountType, discountValue,
            maxDiscount, minOrderValue, applicableFlows,
            usageLimit, perUserLimit, isActive, expiresAt,
        } = req.body;

        if (!code || !discountType || discountValue === undefined) {
            return sendError(res, 'code, discountType, and discountValue are required', 400);
        }

        const conn = await getOrderConn();

        // Check for duplicate code
        const existing = await conn.db
            .collection('coupons')
            .findOne({ code: code.toUpperCase() });
        if (existing) return sendError(res, 'A coupon with this code already exists', 409);

        const couponDoc = {
            code: code.toUpperCase().trim(),
            description: description || '',
            discountType,
            discountValue,
            maxDiscount: maxDiscount || 0,
            minOrderValue: minOrderValue || 0,
            applicableFlows: applicableFlows || [],
            usageLimit: usageLimit || 0,
            usedCount: 0,
            perUserLimit: perUserLimit || 1,
            isActive: isActive !== false,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await conn.db.collection('coupons').insertOne(couponDoc);

        await AuditLog.create({
            actorId: req.headers['x-user-id'] || '',
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.coupons.created',
            targetType: 'coupon',
            targetId: String(result.insertedId),
            metadata: { code: couponDoc.code, discountType, discountValue },
        });

        return sendCreated(res, { ...couponDoc, _id: result.insertedId }, 'Coupon created');
    } catch (err) {
        next(err);
    }
};

// ─── PUT /api/admin/coupons/:id ───────────────────────────

const updateCoupon = async (req, res, next) => {
    try {
        const conn = await getOrderConn();
        const couponId = new mongoose.Types.ObjectId(req.params.id);

        const allowedFields = [
            'description', 'discountType', 'discountValue', 'maxDiscount',
            'minOrderValue', 'applicableFlows', 'usageLimit', 'perUserLimit',
            'isActive', 'expiresAt',
        ];

        const update = { updatedAt: new Date() };
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                update[field] = field === 'expiresAt' ? new Date(req.body[field]) : req.body[field];
            }
        }

        const result = await conn.db
            .collection('coupons')
            .findOneAndUpdate(
                { _id: couponId },
                { $set: update },
                { returnDocument: 'after' }
            );

        if (!result) return sendError(res, 'Coupon not found', 404);

        await AuditLog.create({
            actorId: req.headers['x-user-id'] || '',
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.coupons.updated',
            targetType: 'coupon',
            targetId: req.params.id,
            metadata: update,
        });

        return sendSuccess(res, result, 'Coupon updated');
    } catch (err) {
        next(err);
    }
};

// ─── DELETE /api/admin/coupons/:id ────────────────────────

const deleteCoupon = async (req, res, next) => {
    try {
        const conn = await getOrderConn();
        const couponId = new mongoose.Types.ObjectId(req.params.id);

        const result = await conn.db.collection('coupons').findOneAndDelete({ _id: couponId });
        if (!result) return sendError(res, 'Coupon not found', 404);

        await AuditLog.create({
            actorId: req.headers['x-user-id'] || '',
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.coupons.deleted',
            targetType: 'coupon',
            targetId: req.params.id,
            metadata: { code: result.code },
        });

        return sendSuccess(res, null, 'Coupon deleted');
    } catch (err) {
        next(err);
    }
};

// ─── GET /api/admin/coupons/:id/usage ─────────────────────

const getCouponUsage = async (req, res, next) => {
    try {
        const conn = await getOrderConn();
        const couponId = new mongoose.Types.ObjectId(req.params.id);

        const coupon = await conn.db.collection('coupons').findOne({ _id: couponId });
        if (!coupon) return sendError(res, 'Coupon not found', 404);

        // Find orders that used this coupon
        const orders = await conn.db
            .collection('orders')
            .find({ couponCode: coupon.code })
            .project({
                _id: 1,
                orderNumber: 1,
                userId: 1,
                total: 1,
                discount: 1,
                status: 1,
                createdAt: 1,
            })
            .sort({ createdAt: -1 })
            .limit(100)
            .toArray();

        const totalDiscount = orders.reduce((sum, o) => sum + (o.discount || 0), 0);
        const uniqueUsers = new Set(orders.map((o) => o.userId)).size;

        return sendSuccess(res, {
            coupon,
            usage: {
                totalUses: orders.length,
                uniqueUsers,
                totalDiscountGiven: totalDiscount,
                remainingUses: coupon.usageLimit > 0
                    ? Math.max(0, coupon.usageLimit - coupon.usedCount)
                    : 'unlimited',
            },
            orders,
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    getCouponUsage,
};
