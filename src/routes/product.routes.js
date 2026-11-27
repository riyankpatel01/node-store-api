const express = require('express');
const { ApiError, asyncHandler } = require('../utils/errors');
const { validate, parseId } = require('../utils/validate');
const { authenticate, requireRole } = require('../middleware/auth');

const productSchema = {
  name: { type: 'string', required: true, min: 2, max: 150 },
  description: { type: 'string', max: 2000 },
  price: { type: 'number', required: true, min: 0, max: 1000000 },
  stock: { type: 'integer', min: 0, max: 1000000, default: 0 },
  category: { type: 'string', required: true, min: 2, max: 60 },
};

const listQuerySchema = {
  page: { type: 'integer', min: 1, default: 1 },
  limit: { type: 'integer', min: 1, max: 100, default: 10 },
  search: { type: 'string', max: 100 },
  category: { type: 'string', max: 60 },
  minPrice: { type: 'number', min: 0 },
  maxPrice: { type: 'number', min: 0 },
  sort: { type: 'string', enum: ['name', 'price', 'stock', 'created_at'], default: 'created_at' },
  order: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
};

module.exports = (models) => {
  const router = express.Router();
  const adminOnly = [authenticate, requireRole('admin')];

  // GET /api/products?page=1&limit=10&search=phone&category=electronics&minPrice=100&sort=price&order=asc
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const query = validate(listQuerySchema, req.query);
      const { items, total } = await models.products.list(query);

      res.json({
        data: items,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      });
    })
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const product = await models.products.findById(parseId(req.params.id));
      if (!product) throw new ApiError(404, 'Product not found');
      res.json({ data: product });
    })
  );

  router.post(
    '/',
    ...adminOnly,
    asyncHandler(async (req, res) => {
      const data = validate(productSchema, req.body);
      const product = await models.products.create({ ...data, createdBy: req.user.id });
      res.status(201).json({ data: product });
    })
  );

  router.patch(
    '/:id',
    ...adminOnly,
    asyncHandler(async (req, res) => {
      const id = parseId(req.params.id);
      const data = validate(productSchema, req.body, { partial: true });

      if (!(await models.products.findById(id))) throw new ApiError(404, 'Product not found');
      const product = await models.products.update(id, data);
      res.json({ data: product });
    })
  );

  router.delete(
    '/:id',
    ...adminOnly,
    asyncHandler(async (req, res) => {
      const deleted = await models.products.remove(parseId(req.params.id));
      if (!deleted) throw new ApiError(404, 'Product not found');
      res.status(204).end();
    })
  );

  return router;
};
