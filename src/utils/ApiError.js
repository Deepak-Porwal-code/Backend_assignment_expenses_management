class ApiError extends Error {
  /**
   * @param {number} statusCode HTTP status
   * @param {string} message Human friendly message
   * @param {Array<{field: string, message: string}>} [errors] Optional field errors
   */
  constructor(statusCode, message, errors = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
