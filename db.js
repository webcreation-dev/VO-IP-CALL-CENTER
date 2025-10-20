const { Pool } = require('pg');

const pool = new Pool({
  user: 'asterisk',
  host: 'localhost',
  database: 'asterisk',
  password: 'Obelix',
  port: 5432,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
