const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  addToWatchlist,
  removeFromWatchlist,
  getWatchlist,
  checkWatchlist,
} = require('../controller/watchlist');


router.get('/watchlist',        protect,      getWatchlist);
router.post('/watchlist',         protect,     addToWatchlist);
router.get('/watchlist/check/:trendId', protect,checkWatchlist);
router.delete('/watchlist/:trendId',   protect ,removeFromWatchlist);

module.exports = router;