const AsteriskManager = require('asterisk-manager');

// Configuration AMI basée sur manager.conf
const amiConfig = {
  port: process.env.AMI_PORT || 5038,
  host: process.env.AMI_HOST || 'localhost',
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

module.exports = {
  ami,
  isConnected: () => isConnected,
  executeAction,
  reloadModule,
  reloadDialplan,
  reloadPJSIP,
  getQueueStatus,
};
