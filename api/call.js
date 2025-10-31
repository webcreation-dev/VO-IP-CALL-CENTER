// const AsteriskManager = require('asterisk-manager');

// // Connexion à AMI
// const ami = new AsteriskManager(5038, 'localhost', 'myuser', 'mypassword', true);

// // Écoute des événements
// ami.on('managerevent', (event) => {
//     console.log('Événement reçu :', event);
// });

// // Vérifie la connexion
// ami.on('connect', () => {
//     console.log('Connecté à AMI');
// });

// // Exemple : Passer un appel de 1001 vers 1002
// ami.action({
//     Action: 'Originate',
//     Channel: 'PJSIP/1001',
//     Context: 'from-internal',
//     Exten: '1002',
//     Priority: 1,
//     CallerID: 'Test AMI <1001>'
// }, (err, res) => {
//     if (err) {
//         console.error('Erreur :', err);
//     } else {
//         console.log('Réponse :', res);
//     }
// });

// // Ferme la connexion après 10 secondes
// setTimeout(() => {
//     ami.disconnect();
// }, 10000);

const AsteriskManager = require('asterisk-manager');

// Connexion à AMI
const ami = new AsteriskManager(
  5038,
  'localhost',
  'admin',
  'your_password',
  true
);

ami.on('connect', () => {
  console.log('✅ Connecté à AMI');

  // Écoute tous les événements
  ami.on('event', (event) => {
    console.log('📡 Événement AMI:', event);
  });

  // Écoute les erreurs
  ami.on('error', (err) => {
    console.error('❌ Erreur AMI:', err);
  });

  // Action Originate
  ami.action({
    Action: 'Originate',
    Channel: 'SIP/2000',
    Application: 'Playback',
    Data: 'hello-world',
    CallerID: 'Test <1000>',
    Async: 'true',
  }, (err, res) => {
    if (err) {
      console.error("❌ Erreur lors de l'action Originate:", err);
    } else {
      console.log('✅ Appel lancé vers SIP/2000:', res);
    }
  });

  // Fermeture après 10s pour avoir le temps de voir les événements
  setTimeout(() => {
    console.log('⏱️ Déconnexion de AMI');
    ami.disconnect();
  }, 10000);
});
