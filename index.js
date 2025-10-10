const express = require('express');
const db = require('./db');
const app = express();
const port = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('API de gestion Asterisk');
});

app.get('/tenants', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM tenants ORDER BY id');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

app.listen(port, () => {
  console.log(`Serveur API démarré sur le port ${port}`);
});
