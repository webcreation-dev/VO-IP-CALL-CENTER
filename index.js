const express = require('express');
const db = require('./db');
const fs = require('fs').promises;
const path = require('path');
const AsteriskManager = require('asterisk-manager');

const app = express();
const port = 3000;

// Configuration AMI
const ami = new AsteriskManager(
  5038,
  'asterisk-kamgoko',
  'admin',
  'your_password',
  true
);
ami.keepConnected();

// Middleware pour parser le JSON
app.use(express.json());

// --- Fonctions de Génération ---

async function generateSipConf() {
  const { rows: peers } = await db.query(
    'SELECT * FROM sip_peers ORDER BY name'
  );

  let sipConfContent = `[general]
context=public
udpbindaddr=0.0.0.0:5060
transport=udp
disallow=all
allow=ulaw,alaw,gsm

; -- Utilisateurs générés --
`;

  for (const peer of peers) {
    sipConfContent += `
[${peer.name}]
type=friend
secret=${peer.secret}
context=${peer.context}
host=dynamic
callerid=${peer.callerid || `"" <${peer.name}>`}
mailbox=${peer.mailbox || ''}
nat=force_rport,comedia
`;
  }

  await fs.writeFile(
    path.join(__dirname, 'asterisk-config', 'sip.conf'),
    sipConfContent
  );
  console.log('sip.conf a été régénéré.');
}

async function generateExtensionsConf() {
  const { rows: extensions } = await db.query(
    'SELECT * FROM extensions ORDER BY context, exten, priority'
  );

  let extensionsConfContent = `[general]
static=yes
writeprotect=no

; -- Extensions générées --
`;

  let currentContext = '';
  for (const ext of extensions) {
    if (ext.context !== currentContext) {
      extensionsConfContent += `\n[${ext.context}]\n`;
      currentContext = ext.context;
    }
    extensionsConfContent += `exten => ${ext.exten},${ext.priority},${
      ext.app
    }(${ext.appdata || ''})\n`;
  }

  await fs.writeFile(
    path.join(__dirname, 'asterisk-config', 'extensions.conf'),
    extensionsConfContent
  );
  console.log('extensions.conf a été régénéré.');
}

async function reloadAsterisk() {
  return new Promise((resolve, reject) => {
    ami.action({ Action: 'Command', Command: 'sip reload' }, (err, res) => {
      if (err) return reject(err);
      console.log('SIP reload command sent.');

      ami.action(
        { Action: 'Command', Command: 'dialplan reload' },
        (err, res) => {
          if (err) return reject(err);
          console.log('Dialplan reload command sent.');
          resolve(res);
        }
      );
    });
  });
}

// --- Routes de l'API ---

app.get('/', (req, res) => {
  res.send('API de gestion Asterisk - Version Fichiers');
});

// Route pour régénérer les fichiers et recharger Asterisk manuellement
app.post('/regenerate', async (req, res) => {
  try {
    await Promise.all([generateSipConf(), generateExtensionsConf()]);
    await reloadAsterisk();
    res
      .status(200)
      .send('Configuration régénérée et Asterisk rechargé avec succès.');
  } catch (err) {
    console.error('Erreur lors de la régénération:', err);
    res.status(500).send('Erreur serveur lors de la régénération.');
  }
});

// Exemple : Route pour ajouter un utilisateur SIP (simplifié)
app.post('/users', async (req, res) => {
  const { tenant_id, name, secret, context, callerid, mailbox } = req.body;

  if (!tenant_id || !name || !secret || !context) {
    return res
      .status(400)
      .send('Les champs tenant_id, name, secret et context sont requis.');
  }

  try {
    // 1. Ajouter à la base de données
    const query = `
            INSERT INTO sip_peers (tenant_id, name, secret, context, callerid, mailbox)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
    const { rows } = await db.query(query, [
      tenant_id,
      name,
      secret,
      context,
      callerid,
      mailbox,
    ]);

    // 2. Régénérer les fichiers et recharger Asterisk
    await Promise.all([generateSipConf(), generateExtensionsConf()]);
    await reloadAsterisk();

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Erreur lors de l'ajout de l'utilisateur:", err);
    res.status(500).send("Erreur serveur lors de l'ajout de l'utilisateur.");
  }
});

app.listen(port, () => {
  console.log(`Serveur API (mode fichier) démarré sur le port ${port}`);
  // Régénération au démarrage pour s'assurer que les fichiers sont synchronisés
  console.log('Régénération initiale au démarrage...');
  setTimeout(() => {
    // Laisse le temps à Asterisk de démarrer
    app.post('/regenerate', {}, {});
  }, 15000);
});
