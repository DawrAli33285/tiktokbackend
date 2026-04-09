const express = require('express');
const router = express.Router();
const { register, login, changePassword} = require('../controller/auth');

router.post('/register', register);
router.post('/login', login);
router.put('/change-password',  changePassword);
module.exports = router;