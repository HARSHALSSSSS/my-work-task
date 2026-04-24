const mongoose = require('mongoose');


const vendorOrgSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, unique: true, index: true },

        businessName: { type: String, required: true, trim: true },
        businessType: { type: String, trim: true }, // printing, gifting, both
        gstNumber: { type: String, trim: true },
        panNumber: { type: String, trim: true },
        agreementStatus: {
            type: String,
            enum: ['pending', 'active', 'expired', 'terminated'],
            default: 'pending',
        },
        agreementAcceptedAt: { type: Date, default: null },

        contactName: { type: String, trim: true },
        contactEmail: { type: String, trim: true, lowercase: true },
        contactPhone: { type: String, trim: true },

        address: {
            line1: { type: String, trim: true },
            line2: { type: String, trim: true },
            city: { type: String, trim: true },
            state: { type: String, trim: true },
            pincode: { type: String, trim: true },
        },

        logo: { type: String },
        website: { type: String },
        legalDocuments: {
            gstCertificate: { type: String, default: '' },
            panCard: { type: String, default: '' },
            companyRegistrationCertificate: { type: String, default: '' },
        },
        legalVerified: { type: Boolean, default: false },

        isApproved: { type: Boolean, default: false },
        approvedAt: { type: Date },
        isSuspended: { type: Boolean, default: false },
        suspendedReason: { type: String },

        priority: { type: Number, default: 0 },
        healthScore: { type: Number, default: 0 },

        bankDetails: {
            accountName: { type: String },
            accountNumber: { type: String },
            ifscCode: { type: String },
            bankName: { type: String },
        },

        deletedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

vendorOrgSchema.index({ isApproved: 1, isSuspended: 1 });

module.exports = mongoose.model('VendorOrg', vendorOrgSchema);
