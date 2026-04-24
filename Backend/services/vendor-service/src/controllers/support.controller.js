const mongoose = require('mongoose');
const { sendSuccess, sendCreated, sendError } = require('../../../../shared/utils/response');

const getNotifConn = async () => {
    const uri = process.env.NOTIFICATION_DB_URI || 'mongodb://127.0.0.1:27017/speedcopy_notifications';
    const existing = mongoose.connections.find(
        (c) => c.name === 'speedcopy_notifications' && c.readyState === 1
    );
    if (existing) return existing;
    return mongoose.createConnection(uri, { family: 4, serverSelectionTimeoutMS: 5000 }).asPromise();
};

const getVendorId = (req) => req.headers['x-user-id'];

const createTicket = async (req, res, next) => {
    try {
        const { subject, category, description, orderId } = req.body;
        if (!subject || !description) return sendError(res, 'Subject and description required', 400);

        const conn = await getNotifConn();
        const ticketDoc = {
            userId: getVendorId(req),
            createdForRole: 'vendor',
            subject,
            category: category || 'other',
            description,
            orderId: orderId || null,
            status: 'open',
            priority: 'medium',
            replies: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await conn.db.collection('tickets').insertOne(ticketDoc);
        return sendCreated(res, { ...ticketDoc, _id: result.insertedId });
    } catch (err) {
        next(err);
    }
};

const getTickets = async (req, res, next) => {
    try {
        const conn = await getNotifConn();
        const data = await conn.db.collection('tickets')
            .find({ userId: getVendorId(req) })
            .sort({ createdAt: -1 })
            .toArray();
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const getTicket = async (req, res, next) => {
    try {
        const conn = await getNotifConn();
        const data = await conn.db.collection('tickets')
            .findOne({ _id: new mongoose.Types.ObjectId(req.params.ticket_id), userId: getVendorId(req) });
        
        if (!data) return sendError(res, 'Ticket not found', 404);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const replyTicket = async (req, res, next) => {
    try {
        const { message } = req.body;
        if (!message) return sendError(res, 'Message is required', 400);

        const conn = await getNotifConn();
        const ticket = await conn.db.collection('tickets')
            .findOne({ _id: new mongoose.Types.ObjectId(req.params.ticket_id), userId: getVendorId(req) });

        if (!ticket) return sendError(res, 'Ticket not found', 404);

        const reply = {
            sender: 'vendor',
            message,
            createdAt: new Date(),
        };

        await conn.db.collection('tickets').updateOne(
            { _id: new mongoose.Types.ObjectId(req.params.ticket_id) },
            {
                $push: { replies: reply },
                $set: { updatedAt: new Date(), status: ticket.status === 'resolved' ? 'open' : ticket.status },
            }
        );

        const updated = await conn.db.collection('tickets')
            .findOne({ _id: new mongoose.Types.ObjectId(req.params.ticket_id) });

        return sendSuccess(res, updated, 'Reply sent');
    } catch (err) {
        next(err);
    }
};

const getSummary = async (req, res, next) => {
    try {
        const conn = await getNotifConn();
        const vendorId = getVendorId(req);
        const tickets = await conn.db.collection('tickets')
            .find({ userId: vendorId })
            .toArray();

        const status_counts = tickets.reduce((acc, t) => {
            acc[t.status] = (acc[t.status] || 0) + 1;
            return acc;
        }, {});

        return sendSuccess(res, { status_counts, total: tickets.length });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createTicket,
    getTickets,
    getTicket,
    replyTicket,
    getSummary,
};
