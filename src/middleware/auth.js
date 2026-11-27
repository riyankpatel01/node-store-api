const jwt = require('jsonwebtoken');
const config = require('../config');
const { ApiError } = require('../utils/errors');

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
    algorithm: 'HS256',
  });
}

/**
 * Require a valid "Authorization: Bearer <token>" header and set req.user.
 */
function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Missing or invalid Authorization header'));
  }

  try {
    // Pin the algorithm so a token signed with a different one is rejected.
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch (err) {
    return next(new ApiError(401, 'Invalid or expired token'));
  }
}

/**
 * Allow only users with one of the given roles (use after authenticate).
 */
const requireRole = (...roles) => (req, res, next) =>
  req.user && roles.includes(req.user.role)
    ? next()
    : next(new ApiError(403, 'You do not have permission to perform this action'));

module.exports = { signToken, authenticate, requireRole };
