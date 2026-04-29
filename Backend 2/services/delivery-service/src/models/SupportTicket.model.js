const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema(
    {
        riderId: { type: String, required: true, index: true },
        taskId: { type: String, default: '', index: true },
        orderId: { type: String, default: '', index: true },
        issueType: { type: String, required: true }, // e.g., 'Payment Issue', 'App Issue', 'Customer Issue'
        description: { type: String, required: true },
        status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open' },
        photoUrl: { type: String, default: '' },
        photoUrls: { type: [String], default: [] },
        location: {
            lat: { type: Number },
            lng: { type: Number },
            heading: { type: Number, default: 0 },
            speedKmph: { type: Number, default: 0 },
            capturedAt: { type: Date },
        },
        externalTicketId: { type: String, default: '', index: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
