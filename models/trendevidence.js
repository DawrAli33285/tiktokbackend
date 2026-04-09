const mongoose = require('mongoose');

const trendEvidenceSchema = new mongoose.Schema({
  trend: { type: mongoose.Schema.Types.ObjectId, ref: 'Trend', required: true },
  platform: { type: String, enum: ['tiktok', 'reddit', 'google', 'youtube', 'other'], required: true },
  screenshotUrl: { type: String },
  pageUrl: { type: String },
  capturedAt: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('TrendEvidence', trendEvidenceSchema);