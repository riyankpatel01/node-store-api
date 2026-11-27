const { ApiError } = require('../utils/errors');

function notFound(req, res, next) {
  next(new ApiError(404, `Route ${req.method} ${req.originalUrl} not found`));
}

// Express recognises error middleware by its four arguments, so keep `next`.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'A record with this value already exists' });
  }

  const status = err.status || 500;
  if (status >= 500) {
    console.error(err); // log the real error, but never leak internals to clients
  }

  const body = { error: status >= 500 ? 'Internal server error' : err.message };
  if (err.details) body.details = err.details;
  return res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
