const { Pool } = require('pg');

const pool = new Pool({
  user: 'asterisk',
  host: '161.97.106.134',
  database: 'asterisk',
  password: 'Obelix',
  port: 5432,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
