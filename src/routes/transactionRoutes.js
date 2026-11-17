const express = require('express');
const controller = require('../controllers/transactionController');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { singleAttachment } = require('../middleware/upload');
const schemas = require('../validators/transactionValidators');

const router = express.Router();
router.use(requireAuth);

router.get('/export.csv', validate({ query: schemas.listQuery }), controller.exportCsv);
router.get('/', validate({ query: schemas.listQuery }), controller.list);
router.post(
  '/',
  singleAttachment,
  validate({ body: schemas.create }),
  controller.create,
);

router.get('/:id/attachment', validate({ params: schemas.params }), controller.attachment);
router.get('/:id', validate({ params: schemas.params }), controller.getOne);
router.patch(
  '/:id',
  singleAttachment,
  validate({ params: schemas.params, body: schemas.update }),
  controller.update,
);
router.delete('/:id', validate({ params: schemas.params }), controller.remove);

module.exports = router;
