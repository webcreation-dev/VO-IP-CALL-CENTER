const { Pool } = require('pg');

// Configuration de la connexion PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'asterisk',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'asterisk',
  password: process.env.DB_PASSWORD || 'Obelix',
  port: process.env.DB_PORT || 5432,
  max: 20, // Nombre maximum de connexions dans le pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Gestion des erreurs de connexion
pool.on('error', (err, client) => {
  console.error('❌ Erreur inattendue sur le client PostgreSQL', err);
  process.exit(-1);
});

// Test de connexion au démarrage
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Impossible de se connecter à PostgreSQL:', err);
  } else {
    console.log('✅ Connexion PostgreSQL établie');
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
