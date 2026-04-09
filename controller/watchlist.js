const WatchlistItem = require('../models/watchlistem');


exports.addToWatchlist = async (req, res) => {
  try {
    const { trendId } = req.body;
    const userId = req.user.id;

    const existing = await WatchlistItem.findOne({ user: userId, trend: trendId });
    if (existing) {
      return res.status(409).json({ message: 'Already in watchlist' });
    }

    const item = await WatchlistItem.create({ user: userId, trend: trendId });
    res.status(201).json({ message: 'Added to watchlist', item });
  } catch (err) {
    console.log(err.message)
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.removeFromWatchlist = async (req, res) => {
  try {
    const { trendId } = req.params;
    const userId = req.user.id;

    const deleted = await WatchlistItem.findOneAndDelete({ user: userId, trend: trendId });
    if (!deleted) {
      return res.status(404).json({ message: 'Not found in watchlist' });
    }

    res.json({ message: 'Removed from watchlist' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


exports.getWatchlist = async (req, res) => {
  try {
    const items = await WatchlistItem.find({ user: req.user.id })
      .populate('trend')
      .sort({ createdAt: -1 });

    res.json({ watchlist: items });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


exports.checkWatchlist = async (req, res) => {
  try {
    const { trendId } = req.params;
    const item = await WatchlistItem.findOne({ user: req.user.id, trend: trendId });
    res.json({ inWatchlist: !!item });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};