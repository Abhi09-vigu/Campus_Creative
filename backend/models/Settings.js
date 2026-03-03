const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema(
    {
        key: { type: String, required: true, unique: true, index: true },
        viewMode: { type: Boolean, default: false }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Settings', SettingsSchema);
