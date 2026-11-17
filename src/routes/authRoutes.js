const express = require('express');
const { register, login, logout, me, updateProfile } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiters');
const schemas = require('../validators/authValidators');

const router = express.Router();

router.post('/register', authLimiter, validate({ body: schemas.register }), register);
router.post('/login', authLimiter, validate({ body: schemas.login }), login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
router.patch('/profile', requireAuth, validate({ body: schemas.updateProfile }), updateProfile);

module.exports = router;
