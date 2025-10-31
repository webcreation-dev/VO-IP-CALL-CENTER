const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'asterisk',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'asterisk',
  password: process.env.DB_PASSWORD || 'Obelix',
  port: process.env.DB_PORT || 5432,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
