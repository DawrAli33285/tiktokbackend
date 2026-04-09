const express = require('express');
const router = express.Router();
const {
  getHomepageTrends,
  getTrendBySlug,
  getCategories,
  getLiveTrends,
  getLiveTrendStats,
  getPastPredictions,  
} = require('../controller/trend');
const { optionalAuth } = require('../middleware/auth');

const TrendEvidence = require('../models/trendevidence');
const TrendComment  = require('../models/trendcomment');
const TrendVideo    = require('../models/trendvideo');

router.get('/homepage-trends', optionalAuth, getHomepageTrends);


router.get('/trends', optionalAuth, getLiveTrends);
router.get('/trends/stats', getLiveTrendStats);  


router.get('/categories', getCategories);


router.get('/trends/:slug', optionalAuth, getTrendBySlug);


router.get('/past-predictions', optionalAuth,getPastPredictions);



router.get('/trends/:trendId/evidence', async (req, res) => {
  try {
    const evidence = await TrendEvidence.find({ trend: req.params.trendId }).sort({ capturedAt: -1 });
    res.json({ evidence });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


router.get('/trends/:trendId/comments', async (req, res) => {
  try {
    const comments = await TrendComment.find({ trend: req.params.trendId }).sort({ capturedAt: -1 });
    res.json({ comments });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


router.get('/trends/:trendId/videos', async (req, res) => {
  try {
    const videos = await TrendVideo.find({ trend: req.params.trendId }).sort({ capturedAt: -1 });
    res.json({ videos });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;