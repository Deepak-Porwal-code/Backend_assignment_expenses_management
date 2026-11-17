const express = require('express');
const controller = require('../controllers/budgetController');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const schemas = require('../validators/budgetValidators');

const router = express.Router();
router.use(requireAuth);

router.get('/', validate({ query: schemas.getQuery }), controller.get);
router.put('/', validate({ body: schemas.upsert }), controller.upsert);
router.delete('/:id', validate({ params: schemas.params }), controller.remove);

module.exports = router;
