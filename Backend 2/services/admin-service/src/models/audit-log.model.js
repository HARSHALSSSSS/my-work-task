const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
    {
        actorId: { type: String, required: true, index: true },
        actorRole: { type: String, required: true, index: true },
        action: { type: String, required: true, index: true },
        targetType: { type: String, default: '', index: true },
        targetId: { type: String, default: '', index: true },
        reason: { type: String, default: '' },
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    { timestamps: true }
);

auditLogSchema.index({ createdAt: -1, action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
