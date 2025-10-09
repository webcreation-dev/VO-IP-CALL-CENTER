const express = require('express');
const db = require('./db');
const app = express();
const port = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello, API World!');
});

app.get('/tenants', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM tenants');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
