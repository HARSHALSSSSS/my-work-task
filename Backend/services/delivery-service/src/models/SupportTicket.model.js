const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema(
    {
        riderId: { type: String, required: true, index: true },
        taskId: { type: String, default: '', index: true },
        issueType: { type: String, required: true }, // e.g., 'Payment Issue', 'App Issue', 'Customer Issue'
        description: { type: String, required: true },
        status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open' },
        photoUrl: { type: String, default: '' },
    },
    { timestamps: true }
);

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
