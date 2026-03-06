const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema(
    {
        key: { type: String, required: true, unique: true, index: true },
        viewMode: { type: Boolean, default: false },
        marksRounds: {
            type: [
                {
                    id: { type: String, required: true },
                    name: { type: String, required: true },
                    createdAt: { type: Date, required: true }
                }
            ],
            default: []
        },
        activeMarksRoundId: { type: String, default: '' }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Settings', SettingsSchema);
