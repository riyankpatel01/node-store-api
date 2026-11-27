# 🛒 Node Store API: REST API with Node.js, Express & MySQL

A production-style REST API for a product catalog. It has **JWT authentication**, **role-based access control**, input validation, pagination, search, filtering, sorting and an **automated test suite** that runs without a database.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-orange)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- **Auth**: register, log in and read your profile, with bcrypt password hashing (cost 12) and signed JWTs
- **Roles**: anyone can browse products, but only **admins** can create, update or delete them
- **Products**: full CRUD with **PATCH partial updates**
- **Querying**: pagination, keyword search, category and price-range filters, and sorting by name, price, stock or date
- **Validation**: clear `422` responses with per-field error messages
- **Consistent errors**: JSON error format with correct status codes (400, 401, 403, 404, 409, 422, 500)
- **Tests**: 20 integration tests using Node's built-in test runner and in-memory models

## 🔒 Security

| Protection | How |
|---|---|
| SQL injection | Parameterized queries via `mysql2`, with `ORDER BY` columns whitelisted |
| Password storage | `bcrypt`, plus timing-safe login that doesn't reveal which emails exist |
| Token forgery | JWT verified with a pinned `HS256` algorithm and an expiry |
| Brute force | Rate limiting on `/api/auth/*` (20 requests per 15 min) |
| HTTP hardening | `helmet` security headers, `x-powered-by` disabled, 100kb body limit |
| Information leaks | 500 errors are logged server-side and return a generic message |
| Secrets | Config comes from `.env` (git-ignored) and the app refuses to start without `JWT_SECRET` |

## 🗂️ Project Structure

```
├── database/schema.sql          # Tables + sample products
├── src/
│   ├── app.js                   # Express app factory (dependency-injected models)
│   ├── server.js                # Starts the server, graceful shutdown
│   ├── config/                  # Env config + MySQL connection pool
│   ├── middleware/              # JWT auth, role guard, error handler
│   ├── models/                  # SQL data access (users, products)
│   ├── routes/                  # /api/auth and /api/products
│   └── utils/                   # ApiError, asyncHandler, validator
└── tests/
    ├── api.test.js              # Integration tests
    └── helpers/memoryModels.js  # In-memory DB used by the tests
```

## 🚀 Getting Started

**Requirements:** Node.js 18+, MySQL 8 (or MariaDB 10.5+)

```bash
git clone https://github.com/riyankpatel01/node-store-api.git
cd node-store-api
npm install

mysql -u root -p < database/schema.sql   # create the DB and sample data
cp .env.example .env                     # then set JWT_SECRET and your DB password

npm run dev                              # http://localhost:3000
npm test                                 # run the test suite (no DB needed)
```

**Make yourself an admin** (new accounts are `user` by default):

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

Then log in again to get a token with the admin role.

## 📚 API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | – | Health check |
| POST | `/api/auth/register` | – | Create an account → `{ user, token }` |
| POST | `/api/auth/login` | – | Log in → `{ user, token }` |
| GET | `/api/auth/me` | Bearer | Current user's profile |
| GET | `/api/products` | – | List products (see query params below) |
| GET | `/api/products/:id` | – | Get one product |
| POST | `/api/products` | Admin | Create a product |
| PATCH | `/api/products/:id` | Admin | Update some fields |
| DELETE | `/api/products/:id` | Admin | Delete a product → `204` |

**List query parameters:** `page` (default 1) · `limit` (1–100, default 10) · `search` · `category` · `minPrice` · `maxPrice` · `sort` (`name` \| `price` \| `stock` \| `created_at`) · `order` (`asc` \| `desc`)

### Examples

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Riyank","email":"riyank@example.com","password":"supersecret1"}'

# Search & filter
curl "http://localhost:3000/api/products?search=laptop&category=electronics&sort=price&order=asc&limit=5"

# Create (admin token)
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"name":"USB-C Hub","price":39.99,"stock":50,"category":"electronics"}'
```

**List response:**

```json
{
  "data": [{ "id": 1, "name": "Gaming Laptop", "price": 1499.99, "stock": 5, "category": "electronics" }],
  "pagination": { "page": 1, "limit": 5, "total": 1, "totalPages": 1 }
}
```

**Validation error (422):**

```json
{
  "error": "Validation failed",
  "details": { "price": "price must be at least 0", "category": "category is required" }
}
```

## 🛣️ Roadmap

- [ ] Refresh tokens & logout
- [ ] Swagger / OpenAPI docs
- [ ] Orders and cart endpoints
- [ ] Docker Compose setup (API + MySQL)

## 📄 License

MIT

---
Built by [Riyank Patel](https://github.com/riyankpatel01) · [Portfolio](https://riyankpatel01.github.io)
