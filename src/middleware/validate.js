const ApiError = require('../utils/ApiError');

function formatIssues(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));
}

/**
 * Validates params, query and body with Zod.
 * Controllers read only from `req.validated` — never from raw input.
 */
function validate(schemas) {
  return (req, _res, next) => {
    req.validated = {};

    for (const key of ['params', 'query', 'body']) {
      const schema = schemas[key];
      if (!schema) {
        req.validated[key] = req[key] || {};
        continue;
      }

      const result = schema.safeParse(req[key] ?? {});
      if (!result.success) {
        return next(new ApiError(
          422,
          'Please check the highlighted fields and try again.',
          formatIssues(result.error),
        ));
      }
      req.validated[key] = result.data;
    }

    next();
  };
}

module.exports = validate;
