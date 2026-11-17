const express = require('express');
const controller = require('../controllers/analyticsController');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const schemas = require('../validators/analyticsValidators');

const router = express.Router();
router.use(requireAuth);

router.get('/', validate({ query: schemas.query }), controller.overview);

module.exports = router;
