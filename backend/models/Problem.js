const mongoose = require('mongoose');

const ProblemSchema = new mongoose.Schema(
    {
        id: { type: String, required: true, unique: true, index: true },
        title: { type: String, required: true, trim: true, maxlength: 120 },
        description: { type: String, required: true, trim: true, maxlength: 5000 },
        difficulty: { type: String, required: true, enum: ['Easy', 'Medium', 'Hard'] },
        isActive: { type: Boolean, default: true },
        isLocked: { type: Boolean, default: false },
        selectedCount: { type: Number, default: 0, min: 0 }
    },
    { timestamps: true }
);

ProblemSchema.index({ isActive: 1, isLocked: 1 });
ProblemSchema.index({ isActive: 1, selectedCount: 1 });

module.exports = mongoose.model('Problem', ProblemSchema);
