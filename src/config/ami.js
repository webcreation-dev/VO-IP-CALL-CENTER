const AsteriskManager = require('asterisk-manager');
const fs = require('fs');

// Configuration AMI basée sur manager.conf
const amiConfig = {
  port: process.env.AMI_PORT || 5038,
  host: process.env.AMI_HOST || '161.97.106.134',
  username: process.env.AMI_USER || 'admin',
  password: process.env.AMI_PASSWORD || 'Sp33Dd14L',
  events: true,
};

// Création de l'instance AMI
const ami = new AsteriskManager(
  amiConfig.port,
  amiConfig.host,
  amiConfig.username,
  amiConfig.password,
  amiConfig.events
);

// Gestion de la connexion
let isConnected = false;

ami.on('connect', () => {
  console.log('✅ Connexion AMI établie');
  isConnected = true;
});

ami.on('disconnect', () => {
  console.log('⚠️  Déconnexion AMI');
  isConnected = false;
});

ami.on('error', err => {
  console.error('❌ Erreur AMI:', err);
  isConnected = false;
});

// Fonction utilitaire pour exécuter une action AMI
const executeAction = (action, callback) => {
  if (!isConnected) {
    return callback(new Error('AMI non connecté'), null);
  }

  ami.action(action, (err, res) => {
    if (err) {
      console.error(`❌ Erreur action AMI ${action.Action}:`, err);
      return callback(err, null);
    }

    // Vérifier si la réponse indique une erreur (ex: endpoint non trouvé)
    if (res && res.response === 'Error') {
      // Pour les endpoints non enregistrés, c'est normal, on log juste en warning
      if (action.Action === 'PJSIPShowEndpoint' && res.message && res.message.includes('Unable to retrieve')) {
        console.warn(`⚠️ Erreur AMI pour endpoint ${action.Endpoint}: ${res.message}`);
      } else {
        console.error(`❌ Erreur action AMI ${action.Action}:`, res);
      }
      return callback(new Error(res.message || 'Erreur AMI'), res);
    }

    callback(null, res);
  });
};

// Fonction pour recharger un module
const reloadModule = (module, callback) => {
  executeAction(
    {
      Action: 'ModuleReload',
      Module: module,
    },
    callback
  );
};

// Fonction pour recharger le dialplan
const reloadDialplan = callback => {
  executeAction(
    {
      Action: 'Command',
      Command: 'dialplan reload',
    },
    callback
  );
};

// Fonction pour recharger PJSIP
const reloadPJSIP = callback => {
  executeAction(
    {
      Action: 'PJSIPReload',
    },
    (err, res) => {
      if (err) {
        // Fallback sur Command si PJSIPReload n'existe pas
        executeAction(
          {
            Action: 'Command',
            Command: 'pjsip reload',
          },
          callback
        );
      } else {
        callback(null, res);
      }
    }
  );
};

// Fonction pour obtenir le statut d'une queue
const getQueueStatus = (queueName, callback) => {
  executeAction(
    {
      Action: 'QueueStatus',
      Queue: queueName,
    },
    callback
  );
};

// Fonction pour ajouter un context au dialplan en écrivant directement dans le fichier partagé
const addDialplanContext = (context, callback) => {
  const extensionsConfPath = '/etc/asterisk/extensions.conf';

  try {
    // Vérifier si le context existe déjà dans le fichier
    const fileContent = fs.readFileSync(extensionsConfPath, 'utf8');

    if (fileContent.includes(`[${context}]`)) {
      console.log(`ℹ️  Context [${context}] existe déjà dans extensions.conf`);
      return callback(null, { message: 'Context already exists' });
    }

    // Ajouter le context au fichier
    const contextBlock = `\n[${context}]\n; Dialplan pour ${context} - chargé depuis PostgreSQL via Realtime\nswitch => Realtime\n`;

    fs.appendFileSync(extensionsConfPath, contextBlock, 'utf8');
    console.log(`✅ Context [${context}] ajouté à extensions.conf`);

    callback(null, { message: 'Context added successfully' });
  } catch (err) {
    console.error(`❌ Erreur lors de l'ajout du context au fichier:`, err);
    callback(err, null);
  }
};

module.exports = {
  ami,
  isConnected: () => isConnected,
  executeAction,
  reloadModule,
  reloadDialplan,
  reloadPJSIP,
  getQueueStatus,
  addDialplanContext,
};
