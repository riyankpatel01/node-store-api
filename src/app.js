const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

/**
 * Build the Express app. Models are injected so tests can run without MySQL.
 */
function createApp({ models } = {}) {
  const data = models || require('./models');
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet()); // secure HTTP headers
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

  // Brute-force protection on login and register.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many attempts, please try again later' },
  });

  app.use('/api/auth', authLimiter, authRoutes(data));
  app.use('/api/products', productRoutes(data));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
