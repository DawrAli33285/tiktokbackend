const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getAccountDashboard,
  addToWatchlist,
  removeFromWatchlist,
  updateSettings,
  getCurrentAccount,
  updateProfile,
  updatePassword,
  updateAvatar,
  contactSupport
} = require('../controller/account');
const {uploadImage}=require('../middleware/upload')

router.get('/account', protect, getAccountDashboard);
router.post('/account/watchlist/:trendId', protect, addToWatchlist);
router.delete('/account/watchlist/:trendId', protect, removeFromWatchlist);
router.put('/account/settings', protect, updateSettings);
router.get('/getCurrentAccount',protect,getCurrentAccount)

router.post('/contact', contactSupport)

router.put('/update-profile', protect,  updateProfile)
router.put('/update-password', protect,updatePassword)
router.put('/update-avatar', protect, uploadImage.single('avatar'), updateAvatar);
module.exports = router;