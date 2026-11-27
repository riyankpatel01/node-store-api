const express = require('express');
const bcrypt = require('bcryptjs');
const { ApiError, asyncHandler } = require('../utils/errors');
const { validate } = require('../utils/validate');
const { signToken, authenticate } = require('../middleware/auth');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const registerSchema = {
  name: { type: 'string', required: true, min: 2, max: 100 },
  email: { type: 'string', required: true, max: 190, pattern: EMAIL, message: 'email must be a valid email address' },
  password: { type: 'string', required: true, min: 8, max: 72 }, // bcrypt only uses the first 72 bytes
};

const loginSchema = {
  email: { type: 'string', required: true },
  password: { type: 'string', required: true },
};

// Compared against when the email doesn't exist, so a login takes the same time
// either way and attackers can't tell which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('timing-attack-protection', 10);

function toPublicUser(user) {
  const { password_hash: _omit, ...safe } = user;
  return safe;
}

module.exports = (models) => {
  const router = express.Router();

  router.post(
    '/register',
    asyncHandler(async (req, res) => {
      const data = validate(registerSchema, req.body);
      const email = data.email.toLowerCase();

      if (await models.users.findByEmail(email)) {
        throw new ApiError(409, 'Email is already registered');
      }

      const passwordHash = await bcrypt.hash(data.password, 12);
      const user = await models.users.create({ name: data.name, email, passwordHash });

      res.status(201).json({ user, token: signToken(user) });
    })
  );

  router.post(
    '/login',
    asyncHandler(async (req, res) => {
      const { email, password } = validate(loginSchema, req.body);
      const user = await models.users.findByEmail(email.toLowerCase());

      const valid = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
      if (!user || !valid) {
        throw new ApiError(401, 'Invalid email or password');
      }

      res.json({ user: toPublicUser(user), token: signToken(user) });
    })
  );

  router.get(
    '/me',
    authenticate,
    asyncHandler(async (req, res) => {
      const user = await models.users.findById(req.user.id);
      if (!user) throw new ApiError(404, 'User not found');
      res.json({ user });
    })
  );

  return router;
};
