const mongoose = require('mongoose');

const trendSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
  rfciScore: { type: Number },
  rfciType: { type: String, enum: ['impact', 'acceleration', 'widespread'] },
  growthRate: { type: Number, default: 0 },
  status: { type: String, enum: ['detected', 'trending', 'peaked', 'dead', 'never_took_off'], default: 'detected' },
  isHidden: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: false },
  detectedAt: { type: Date, default: Date.now },
  purpose: { type: String, enum: ['seo', 'business_idea', 'content_creation', 'keyword_research'], default: null }, 
  daysToViral: { type: Number, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Trend', trendSchema);