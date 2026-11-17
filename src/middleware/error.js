const env = require('../config/env');
const ApiError = require('../utils/ApiError');

function notFound(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

function errorHandler(error, _req, res, _next) {
  let status = error.statusCode || 500;
  let message = error.message || 'Something went wrong.';
  let errors = error.errors;

  if (error.name === 'ValidationError') {
    status = 422;
    message = 'Please check the highlighted fields and try again.';
    errors = Object.values(error.errors).map((item) => ({
      field: item.path,
      message: item.message,
    }));
  }

  if (error.name === 'CastError') {
    status = 400;
    message = 'That identifier is not valid.';
  }

  if (error.code === 11000) {
    status = 409;
    message = 'That record already exists.';
  }

  if (error.type === 'entity.too.large') {
    status = 413;
    message = 'The request is too large.';
  }

  if (status >= 500) {
    // Log server errors, never leak internals to the client.
    // eslint-disable-next-line no-console
    console.error('[moneta]', error);
    if (env.isProduction) {
      message = 'Something went wrong. Please try again.';
      errors = undefined;
    }
  }

  const body = { message };
  if (errors && errors.length) body.errors = errors;
  if (!env.isProduction && status >= 500) body.stack = error.stack;

  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
