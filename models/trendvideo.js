
const mongoose = require('mongoose');

const trendVideoSchema = new mongoose.Schema({
  trend: { type: mongoose.Schema.Types.ObjectId, ref: 'Trend', required: true },
  videoUrl: { type: String, required: true },
  creatorHandle: { type: String },
  viewCount: { type: Number, default: 0 },
  commentCount: { type: Number, default: 0 },
  capturedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('TrendVideo', trendVideoSchema);