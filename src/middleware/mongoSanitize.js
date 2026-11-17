/**
 * Removes MongoDB operator keys ($) and dotted keys from user input.
 * Validation schemas are strict as well, so this is a second line of defence.
 */
function clean(value) {
  if (!value || typeof value !== 'object' || Buffer.isBuffer(value)) return value;

  if (Array.isArray(value)) {
    value.forEach(clean);
    return value;
  }

  for (const key of Object.keys(value)) {
    if (
      key.startsWith('$')
      || key.includes('.')
      || key === '__proto__'
      || key === 'constructor'
      || key === 'prototype'
    ) {
      delete value[key];
      continue;
    }
    clean(value[key]);
  }

  return value;
}

function mongoSanitize(req, _res, next) {
  if (req.body) clean(req.body);
  if (req.params) clean(req.params);
  next();
}

module.exports = mongoSanitize;
