const mongoose = require('mongoose');

const SelectionSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, unique: true, index: true },
        teamName: { type: String, required: true, trim: true, maxlength: 200 },
        email: { type: String, required: false, default: '', trim: true, maxlength: 320 },
        problemId: { type: String, required: true, trim: true, maxlength: 64 },
        problemTitle: { type: String, required: true, trim: true, maxlength: 200 },
        timestamp: { type: Date, required: true }
    },
    { timestamps: true }
);

SelectionSchema.index({ problemId: 1, timestamp: -1 });

module.exports = mongoose.model('Selection', SelectionSchema);
