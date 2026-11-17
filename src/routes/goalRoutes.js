const express = require('express');
const controller = require('../controllers/goalController');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const schemas = require('../validators/goalValidators');

const router = express.Router();
router.use(requireAuth);

router.get('/', controller.list);
router.post('/', validate({ body: schemas.create }), controller.create);
router.patch('/:id', validate({ params: schemas.params, body: schemas.update }), controller.update);
router.delete('/:id', validate({ params: schemas.params }), controller.remove);

module.exports = router;
