const { Pool } = require('pg');

const pool = new Pool({
  user: 'asterisk',
  host: 'localhost',
  database: 'asterisk',
  password: 'asterisk',
  port: 5433,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
