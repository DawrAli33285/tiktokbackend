const express = require('express')
const router  = express.Router()
const { stripeWebhook } = require('../controller/webhook')

router.post('/stripe', express.raw({ type: 'application/json' }), stripeWebhook)

module.exports = router 