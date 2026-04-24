const { z } = require('zod');
const { successResponse, errorResponse } = require('../utils/api-response');
const {
    acceptTask: acceptTaskService,
    confirmPickup: confirmPickupService,
    createDeliveryTaskInternal,
    getCurrentTaskForRider: getCurrentTaskForRiderService,
    getAvailability: getAvailabilityService,
    getEarningsSummary: getEarningsSummaryService,
    getTaskById: getTaskByIdService,
    listAvailableTasks: listAvailableTasksService,
    listRiderTasks: listRiderTasksService,
    markArrivedPickup: markArrivedPickupService,
    markDeliveryFailure: markDeliveryFailureService,
    markDelivered: markDeliveredService,
    rejectTask: rejectTaskService,
    raiseSos,
    submitDeliveryProof: submitDeliveryProofService,
    submitIdentityVerification,
    trackByOrderId,
    updateAvailability: updateAvailabilityService,
    updateLiveLocation,
    sendOtp,
    verifyOtp,
    getProfile,
    updateProfile,
    raiseSupportIncident,
} = require('../services/delivery.service');

const locationSchema = z.object({ lat: z.number(), lng: z.number() });

const createTaskSchema = z.object({
    orderId: z.string().min(3),
    customerId: z.string().min(3),
    pickup: z.object({
        name: z.string().min(2),
        addressLine: z.string().min(3),
        note: z.string().optional(),
        contactName: z.string().optional(),
        contactPhone: z.string().optional(),
        location: locationSchema,
    }),
    dropoff: z.object({
        name: z.string().min(2),
        addressLine: z.string().min(3),
        note: z.string().optional(),
        contactName: z.string().optional(),
        contactPhone: z.string().optional(),
        location: locationSchema,
    }),
    items: z
        .array(
            z.object({
                itemId: z.string().min(1),
                title: z.string().min(2),
                subtitle: z.string().optional(),
                quantity: z.number().int().positive(),
            })
        )
        .optional(),
    specialInstructions: z.string().optional(),
    etaMinutes: z.number().nonnegative().optional(),
    distanceKm: z.number().nonnegative().optional(),
});

const locationUpdateSchema = z.object({
    lat: z.number(),
    lng: z.number(),
    heading: z.number().optional(),
    speedKmph: z.number().optional(),
    etaMinutes: z.number().nonnegative().optional(),
    distanceKm: z.number().nonnegative().optional(),
});
const availabilitySchema = z.object({ isAvailable: z.boolean() });
const identitySchema = z.object({
    idDocumentUrl: z.string().min(3),
    selfieUrl: z.string().min(3),
});
const deliveryProofSchema = z.object({
    otp: z.string().optional(),
    photoUrl: z.string().optional(),
    notes: z.string().optional(),
});
const failureSchema = z.object({
    reason: z.string().min(2),
    note: z.string().optional(),
});

const routeParam = (req, key) => String(req.params[key] || '');
const getRiderId = (req) => req.user?.userId || '';

const ensureDeliveryRole = (req, res) => {
    const role = req.user?.role;
    if (role !== 'delivery_partner' && role !== 'delivery') {
        res.status(403).json(errorResponse('Forbidden: delivery_partner role required'));
        return false;
    }
    return true;
};

const jwt = require('jsonwebtoken');

const deliveryController = {
    async authSendOtp(req, res) {
        try {
            const { phone } = req.body;
            if (!phone) return res.status(400).json(errorResponse('Phone is required'));
            const status = await sendOtp(phone);
            res.json(successResponse({ status }));
        } catch (err) {
            res.status(400).json(errorResponse(err.message));
        }
    },

    async authVerifyOtp(req, res) {
        try {
            const { phone, otp } = req.body;
            if (!phone || !otp) return res.status(400).json(errorResponse('Phone and OTP required'));
            const profile = await verifyOtp(phone, otp);
            
            const token = jwt.sign(
                { userId: profile.userId, role: 'delivery_partner' },
                process.env.JWT_SECRET || 'speedcopy_dev_jwt_secret_change_in_production',
                { expiresIn: '30d' }
            );

            res.json(successResponse({ profile, token }));
        } catch (err) {
            res.status(400).json(errorResponse(err.message));
        }
    },

    async getProfile(req, res) {
        try {
            if (!ensureDeliveryRole(req, res)) return;
            const profile = await getProfile(getRiderId(req));
            res.json(successResponse(profile));
        } catch (err) {
            res.status(400).json(errorResponse(err.message));
        }
    },

    async updateProfile(req, res) {
        try {
            if (!ensureDeliveryRole(req, res)) return;
            // Allow updating name, phone, email, vehicleType
            const { name, phone, email, vehicleType } = req.body;
            const updates = {};
            if (name !== undefined) updates.name = name;
            if (phone !== undefined) updates.phone = phone;
            if (email !== undefined) updates.email = email;
            if (vehicleType !== undefined) updates.vehicleType = vehicleType;

            const profile = await updateProfile(getRiderId(req), updates);
            res.json(successResponse(profile));
        } catch (err) {
            res.status(400).json(errorResponse(err.message));
        }
    },

    async supportIncident(req, res) {
        try {
            if (!ensureDeliveryRole(req, res)) return;
            const { issueType, description, taskId, photoUrl } = req.body;
            if (!issueType || !description) {
                return res.status(400).json(errorResponse('issueType and description are required'));
            }
            const ticket = await raiseSupportIncident(getRiderId(req), { issueType, description, taskId, photoUrl });
            res.json(successResponse(ticket));
        } catch (err) {
            res.status(400).json(errorResponse(err.message));
        }
    },

    async internalCreateTask(req, res) {
        try {
            const payload = createTaskSchema.parse(req.body);
            const data = await createDeliveryTaskInternal(payload);
            res.status(201).json(successResponse(data));
        } catch (err) {
            res.status(400).json(
                errorResponse(err instanceof Error ? err.message : 'Invalid payload')
            );
        }
    },

    async availableTasks(req, res) {
        if (!ensureDeliveryRole(req, res)) return;
        const data = await listAvailableTasksService(
            Number(req.query.page || 1),
            Number(req.query.limit || 20)
        );
        res.json(successResponse(data));
    },

    async acceptTask(req, res) {
        try {
            if (!ensureDeliveryRole(req, res)) return;
            const id = req.body?.taskId || routeParam(req, 'taskId');
            if (!id) return res.status(400).json(errorResponse('taskId is required'));
            const data = await acceptTaskService(id, getRiderId(req));
            res.json(successResponse(data));
        } catch (err) {
            res.status(400).json(
                errorResponse(err instanceof Error ? err.message : 'Failed to accept task')
            );
        }
    },

    async rejectTask(req, res) {
        try {
            if (!ensureDeliveryRole(req, res)) return;
            const { reason } = req.body || {};
            const data = await rejectTaskService(routeParam(req, 'taskId'), getRiderId(req), reason);
            res.json(successResponse(data));
        } catch (err) {
            res.status(400).json(errorResponse(err instanceof Error ? err.message : 'Failed'));
        }
    },

    async currentTask(req, res) {
        if (!ensureDeliveryRole(req, res)) return;
        const data = await getCurrentTaskForRiderService(getRiderId(req));
        if (!data) return res.status(404).json(errorResponse('No active task'));
        res.json(successResponse(data));
    },

    async riderTasks(req, res) {
        if (!ensureDeliveryRole(req, res)) return;
        const data = await listRiderTasksService(
            getRiderId(req),
            req.query.status,
            Number(req.query.page || 1),
            Number(req.query.limit || 20)
        );
        res.json(successResponse(data));
    },

    async getTask(req, res) {
        if (!ensureDeliveryRole(req, res)) return;
        const data = await getTaskByIdService(routeParam(req, 'taskId'));
        if (!data) return res.status(404).json(errorResponse('Delivery task not found'));
        res.json(successResponse(data));
    },

    async arrivedPickup(req, res) {
        try {
            if (!ensureDeliveryRole(req, res)) return;
            const data = await markArrivedPickupService(routeParam(req, 'taskId'), getRiderId(req));
            res.json(successResponse(data));
        } catch (err) {
            res.status(400).json(errorResponse(err instanceof Error ? err.message : 'Failed'));
        }
    },

    async confirmPickup(req, res) {
        try {
            if (!ensureDeliveryRole(req, res)) return;
            const { checkedItemIds = [] } = req.body || {};
            const data = await confirmPickupService(
                routeParam(req, 'taskId'),
                getRiderId(req),
                checkedItemIds
            );
            res.json(successResponse(data));
        } catch (err) {
            res.status(400).json(errorResponse(err instanceof Error ? err.message : 'Failed'));
        }
    },

    async updateLocation(req, res) {
        try {
            if (!ensureDeliveryRole(req, res)) return;
            const payload = locationUpdateSchema.parse(req.body);
            const data = await updateLiveLocation(
                routeParam(req, 'taskId'),
                getRiderId(req),
                payload
            );
            res.json(successResponse(data));
        } catch (err) {
            res.status(400).json(errorResponse(err instanceof Error ? err.message : 'Failed'));
        }
    },

    async markDelivered(req, res) {
        try {
            if (!ensureDeliveryRole(req, res)) return;
            const data = await markDeliveredService(routeParam(req, 'taskId'), getRiderId(req));
            res.json(successResponse(data));
        } catch (err) {
            res.status(400).json(errorResponse(err instanceof Error ? err.message : 'Failed'));
        }
    },

    async submitDeliveryProof(req, res) {
        try {
            if (!ensureDeliveryRole(req, res)) return;
            const payload = deliveryProofSchema.parse(req.body || {});
            const data = await submitDeliveryProofService(
                routeParam(req, 'taskId'),
                getRiderId(req),
                payload
            );
            res.json(successResponse(data));
        } catch (err) {
            res.status(400).json(errorResponse(err instanceof Error ? err.message : 'Failed'));
        }
    },

    async markFailure(req, res) {
        try {
            if (!ensureDeliveryRole(req, res)) return;
            const payload = failureSchema.parse(req.body || {});
            const data = await markDeliveryFailureService(
                routeParam(req, 'taskId'),
                getRiderId(req),
                payload.reason,
                payload.note
            );
            res.json(successResponse(data));
        } catch (err) {
            res.status(400).json(errorResponse(err instanceof Error ? err.message : 'Failed'));
        }
    },

    async sos(req, res) {
        try {
            if (!ensureDeliveryRole(req, res)) return;
            const { message } = req.body || {};
            if (!message) return res.status(400).json(errorResponse('message is required'));
            const data = await raiseSos(routeParam(req, 'taskId'), getRiderId(req), message);
            res.json(successResponse(data));
        } catch (err) {
            res.status(400).json(errorResponse(err instanceof Error ? err.message : 'Failed'));
        }
    },

    async trackByOrder(req, res) {
        const data = await trackByOrderId(routeParam(req, 'orderId'));
        if (!data) return res.status(404).json(errorResponse('Tracking not found'));
        res.json(successResponse(data));
    },

    async getAvailability(req, res) {
        if (!ensureDeliveryRole(req, res)) return;
        const data = await getAvailabilityService(getRiderId(req));
        res.json(successResponse(data));
    },

    async updateAvailability(req, res) {
        try {
            if (!ensureDeliveryRole(req, res)) return;
            const payload = availabilitySchema.parse(req.body || {});
            const data = await updateAvailabilityService(getRiderId(req), payload.isAvailable);
            res.json(successResponse(data));
        } catch (err) {
            res.status(400).json(errorResponse(err instanceof Error ? err.message : 'Failed'));
        }
    },

    async submitIdentity(req, res) {
        try {
            if (!ensureDeliveryRole(req, res)) return;
            const payload = identitySchema.parse(req.body || {});
            const data = await submitIdentityVerification(getRiderId(req), payload);
            res.json(successResponse(data));
        } catch (err) {
            res.status(400).json(errorResponse(err instanceof Error ? err.message : 'Failed'));
        }
    },

    async earningsSummary(req, res) {
        if (!ensureDeliveryRole(req, res)) return;
        const data = await getEarningsSummaryService(getRiderId(req));
        res.json(successResponse(data));
    },
};

module.exports = { deliveryController };
