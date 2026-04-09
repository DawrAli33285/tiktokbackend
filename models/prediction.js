const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
  trend: { type: mongoose.Schema.Types.ObjectId, ref: 'Trend', required: true, unique: true },
  outcome: { type: String, enum: ['pending', 'correct', 'incorrect'], default: 'pending' },
  confirmedAt: { type: Date },
  peakGrowthRate: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('Prediction', predictionSchema);