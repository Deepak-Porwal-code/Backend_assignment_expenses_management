const multer = require('multer');
const ApiError = require('../utils/ApiError');

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter(_req, file, callback) {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      callback(new ApiError(422, 'Attachments must be a JPG, PNG, WebP, GIF or PDF file.'));
      return;
    }
    callback(null, true);
  },
});

/** Converts Multer's errors into friendly API errors. */
function singleAttachment(req, res, next) {
  upload.single('attachment')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      next(new ApiError(422, 'Attachment must be smaller than 2 MB.'));
      return;
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      next(new ApiError(422, 'Only one attachment is allowed.'));
      return;
    }

    next(error);
  });
}

module.exports = { singleAttachment, MAX_FILE_SIZE, ALLOWED_TYPES };
