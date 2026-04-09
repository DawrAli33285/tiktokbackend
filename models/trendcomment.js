const mongoose = require('mongoose');

const trendCommentSchema = new mongoose.Schema({
  trend: { type: mongoose.Schema.Types.ObjectId, ref: 'Trend', required: true },
  platform: { type: String, enum: ['tiktok', 'youtube', 'reddit', 'other'], default: 'tiktok' },
  authorHandle: { type: String },
  commentText: { type: String, required: true },
  likeCount: { type: Number, default: 0 },
  sourceVideoUrl: { type: String }, 
  capturedAt: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('TrendComment', trendCommentSchema);