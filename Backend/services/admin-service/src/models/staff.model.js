const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['ops', 'support', 'finance', 'marketing', 'admin'],
      default: 'ops',
    },
    permissions: [String],
    mfaEnabled: {
      type: Boolean,
      default: true,
    },
    mfaSecret: String,
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    lastLogin: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
    metadata: {
      department: String,
      manager: String,
      joinDate: Date,
    },
  },
  { timestamps: true }
);

staffSchema.index({ email: 1 });
staffSchema.index({ role: 1 });
staffSchema.index({ status: 1 });

module.exports = mongoose.model('Staff', staffSchema);
