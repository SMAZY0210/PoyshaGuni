const express = require('express');
const router = express.Router();
const { signup, login, getMe } = require('../controllers/authController');
const { validateSignup, validateLogin } = require('../middleware/validate');
const { protect } = require('../middleware/auth');

router.post('/signup', validateSignup, signup);
router.post('/login', validateLogin, login);
router.get('/me', protect, getMe);

module.exports = router;
