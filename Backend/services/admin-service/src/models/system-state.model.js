const mongoose = require('mongoose');

const featureFlagsSchema = new mongoose.Schema(
    {
        gifting: { type: Boolean, default: true },
        shopping: { type: Boolean, default: true },
        printing: { type: Boolean, default: true },
        referrals: { type: Boolean, default: true },
        wallet: { type: Boolean, default: true },
    },
    { _id: false }
);

const systemStateSchema = new mongoose.Schema(
    {
        key: { type: String, default: 'global', unique: true, index: true },
        orderIntakeEnabled: { type: Boolean, default: true },
        vendorIntakeEnabled: { type: Boolean, default: true },
        systemKillSwitchEnabled: { type: Boolean, default: false },
        pausedCities: { type: [String], default: [] },
        featureFlags: { type: featureFlagsSchema, default: () => ({}) },
        lastUpdatedBy: { type: String, default: '' },
    },
    { timestamps: true }
);

module.exports = mongoose.model('SystemState', systemStateSchema);
