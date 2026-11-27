const mysql = require('mysql2/promise');
const config = require('./index');

// A connection pool reuses connections instead of opening one per request.
const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true, // return DECIMAL columns (price) as numbers, not strings
});

module.exports = pool;
