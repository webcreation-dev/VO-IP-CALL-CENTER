/**
 * Configuration CORS pour permettre les requêtes depuis le frontend
 */
const cors = require('cors');

const corsOptions = {
  origin: function (origin, callback) {
    // Autoriser toutes les origines en développement
    // En production, limiter à des domaines spécifiques
    const whitelist = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      // Ajouter vos domaines de production ici
    ];

    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Non autorisé par CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

module.exports = cors(corsOptions);