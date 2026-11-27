/**
 * An error with an HTTP status code that is safe to show to API clients.
 */
class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Wrap async route handlers so rejected promises reach the error middleware.
 */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { ApiError, asyncHandler };
