const express = require('express')
const router  = express.Router()
const { createSubscription,getUserSubscription } = require('../controller/subscription')
const { protect } = require('../middleware/auth')

router.post('/create', protect, createSubscription)
router.get('/me',       protect, getUserSubscription)
module.exports = router