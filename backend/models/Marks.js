const mongoose = require('mongoose');

const MarksSchema = new mongoose.Schema(
	{
		userId: { type: String, required: true, index: true, trim: true, maxlength: 128 },
		roundId: { type: String, required: true, index: true, trim: true, maxlength: 128 },
		roundName: { type: String, required: true, trim: true, maxlength: 120 },

		total: { type: Number, required: true, min: 0, max: 10, default: 0 },
		criteria: {
			clarity: { type: Number, required: true, min: 0, max: 10, default: 0 },
			relevance: { type: Number, required: true, min: 0, max: 10, default: 0 },
			technical: { type: Number, required: true, min: 0, max: 10, default: 0 },
			prototype: { type: Number, required: true, min: 0, max: 10, default: 0 }
		},

		updatedAt: { type: Date, required: true, default: Date.now }
	},
	{ timestamps: true }
);

MarksSchema.index({ userId: 1, roundId: 1 }, { unique: true });

// Explicit separate collection name.
module.exports = mongoose.model('Marks', MarksSchema, 'round_marks');
