/**
 * In-memory versions of the MySQL models with the same interface,
 * so the API tests run fast without a database.
 */
function createMemoryModels() {
  const users = [];
  const products = [];
  let userId = 0;
  let productId = 0;
  const now = () => new Date().toISOString();
  const publicUser = ({ password_hash: _omit, ...u }) => u;

  return {
    users: {
      async findByEmail(email) {
        return users.find((u) => u.email === email) || null;
      },
      async findById(id) {
        const user = users.find((u) => u.id === id);
        return user ? publicUser(user) : null;
      },
      async create({ name, email, passwordHash, role = 'user' }) {
        const user = { id: ++userId, name, email, role, password_hash: passwordHash, created_at: now() };
        users.push(user);
        return publicUser(user);
      },
      // Test-only helper: there is no API endpoint for promoting users.
      setRole(email, role) {
        users.find((u) => u.email === email).role = role;
      },
    },

    products: {
      async list({ page, limit, search, category, minPrice, maxPrice, sort, order }) {
        let rows = products.filter((p) => {
          if (search) {
            const s = search.toLowerCase();
            if (!p.name.toLowerCase().includes(s) && !(p.description || '').toLowerCase().includes(s)) return false;
          }
          if (category && p.category !== category) return false;
          if (minPrice !== undefined && p.price < minPrice) return false;
          if (maxPrice !== undefined && p.price > maxPrice) return false;
          return true;
        });

        const dir = order === 'asc' ? 1 : -1;
        rows = [...rows].sort((a, b) => {
          if (a[sort] === b[sort]) return b.id - a.id;
          return a[sort] > b[sort] ? dir : -dir;
        });

        return { items: rows.slice((page - 1) * limit, page * limit), total: rows.length };
      },
      async findById(id) {
        return products.find((p) => p.id === id) || null;
      },
      async create(data) {
        const product = {
          id: ++productId,
          name: data.name,
          description: data.description ?? null,
          price: data.price,
          stock: data.stock,
          category: data.category,
          created_by: data.createdBy,
          created_at: now(),
          updated_at: now(),
        };
        products.push(product);
        return product;
      },
      async update(id, data) {
        const product = products.find((p) => p.id === id);
        for (const key of ['name', 'description', 'price', 'stock', 'category']) {
          if (data[key] !== undefined) product[key] = data[key];
        }
        product.updated_at = now();
        return product;
      },
      async remove(id) {
        const index = products.findIndex((p) => p.id === id);
        if (index === -1) return false;
        products.splice(index, 1);
        return true;
      },
    },
  };
}

module.exports = { createMemoryModels };
