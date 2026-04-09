const mongoose = require('mongoose');

const watchlistItemSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  trend: { type: mongoose.Schema.Types.ObjectId, ref: 'Trend', required: true },
}, { timestamps: true });

watchlistItemSchema.index({ user: 1, trend: 1 }, { unique: true });

module.exports = mongoose.model('WatchlistItem', watchlistItemSchema);