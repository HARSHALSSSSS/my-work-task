const mongoose = require('mongoose');

const replySchema = new mongoose.Schema(
    {
        authorId: { type: String, required: true },
        authorRole: {
            type: String,
            enum: ['user', 'vendor', 'admin', 'staff', 'delivery_partner', 'super_admin'],
            default: 'user',
        },
        message: { type: String, required: true, trim: true },
        attachments: [{ type: String }],
    },
    { timestamps: true }
);

const ticketSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, index: true },
        orderId: { type: String, index: true },

        subject: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },

        category: {
            type: String,
            enum: [
                'order_issue',
                'payment_issue',
                'delivery_issue',
                'product_issue',
                'account_issue',
                'other',
            ],
            default: 'other',
        },

        status: {
            type: String,
            enum: ['open', 'in_progress', 'resolved', 'closed'],
            default: 'open',
        },

        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'urgent'],
            default: 'medium',
        },

        assignedTo: { type: String }, // staff userId
        createdForRole: {
            type: String,
            enum: ['user', 'vendor', 'delivery_partner', 'staff', 'admin'],
            default: 'user',
        },
        visibilityScope: {
            type: String,
            enum: ['customer', 'vendor_internal', 'delivery_internal', 'ops_internal'],
            default: 'customer',
        },

        replies: { type: [replySchema], default: [] },
        attachments: { type: [String], default: [] },
        metadata: { type: mongoose.Schema.Types.Mixed, default: null },

        resolvedAt: { type: Date },
        closedAt: { type: Date },
    },
    { timestamps: true }
);

ticketSchema.index({ userId: 1, status: 1 });
ticketSchema.index({ status: 1, priority: -1, createdAt: -1 });

module.exports = mongoose.model('Ticket', ticketSchema);
