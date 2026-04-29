const mongoose = require('mongoose');

const vendorStaffSchema = new mongoose.Schema(
    {
        vendorId: { type: String, required: true, index: true },
        storeId: { type: String, index: true },
        assignedStoreIds: { type: [String], default: [] },
        authUserId: { type: String, index: true },

        name: { type: String, required: true, trim: true },
        email: { type: String, trim: true, lowercase: true },
        phone: { type: String, trim: true },

        role: {
            type: String,
            enum: ['manager', 'operator', 'qc'],
            default: 'operator',
        },
        permissions: { type: [String], default: [] },
        isFinancialAccessEnabled: { type: Boolean, default: false },

        isActive: { type: Boolean, default: true },
        deletedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

vendorStaffSchema.index({ vendorId: 1, isActive: 1 });

module.exports = mongoose.model('VendorStaff', vendorStaffSchema);
