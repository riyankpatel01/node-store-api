const pool = require('../config/db');

// Only these columns may be used in ORDER BY. User input is never put into SQL directly.
const SORTABLE = { name: 'name', price: 'price', stock: 'stock', created_at: 'created_at' };
const WRITABLE = ['name', 'description', 'price', 'stock', 'category'];

async function list({ page, limit, search, category, minPrice, maxPrice, sort, order }) {
  const where = [];
  const params = [];

  if (search) {
    where.push('(name LIKE ? OR description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    where.push('category = ?');
    params.push(category);
  }
  if (minPrice !== undefined) {
    where.push('price >= ?');
    params.push(minPrice);
  }
  if (maxPrice !== undefined) {
    where.push('price <= ?');
    params.push(maxPrice);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sortColumn = SORTABLE[sort] || 'created_at';
  const direction = order === 'asc' ? 'ASC' : 'DESC';

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM products ${whereSql}`, params);
  const [items] = await pool.query(
    `SELECT * FROM products ${whereSql} ORDER BY ${sortColumn} ${direction}, id DESC LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit]
  );

  return { items, total };
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
  return rows[0] || null;
}

async function create(data) {
  const [result] = await pool.query(
    'INSERT INTO products (name, description, price, stock, category, created_by) VALUES (?, ?, ?, ?, ?, ?)',
    [data.name, data.description ?? null, data.price, data.stock, data.category, data.createdBy]
  );
  return findById(result.insertId);
}

/** Partial update: only the fields that were sent are changed. */
async function update(id, data) {
  const fields = WRITABLE.filter((f) => data[f] !== undefined);
  if (fields.length) {
    const setSql = fields.map((f) => `${f} = ?`).join(', ');
    await pool.query(`UPDATE products SET ${setSql} WHERE id = ?`, [...fields.map((f) => data[f]), id]);
  }
  return findById(id);
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { list, findById, create, update, remove };
