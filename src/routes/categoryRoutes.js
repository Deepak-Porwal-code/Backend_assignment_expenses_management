const express = require('express');
const controller = require('../controllers/categoryController');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const schemas = require('../validators/categoryValidators');

const router = express.Router();
router.use(requireAuth);

router.get('/', validate({ query: schemas.listQuery }), controller.list);
router.post('/', validate({ body: schemas.create }), controller.create);
router.patch('/:id', validate({ params: schemas.params, body: schemas.update }), controller.update);
router.delete('/:id', validate({ params: schemas.params }), controller.remove);

module.exports = router;
