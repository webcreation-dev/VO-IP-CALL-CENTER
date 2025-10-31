const AsteriskManager = require('asterisk-manager');

// Créer une instance AMI pour la connexion
const ami = new AsteriskManager(5038, 'localhost', 'myuser', 'mypassword', true);

// Connexion à AMI
ami.connect(() => {
  console.log('Connecté à AMI');
});

// Lancer un appel de 1001 vers 1002
ami.action({
  Action: 'Originate',           // Action pour initier l'appel
  Channel: 'PJSIP/1001',         // Canal d'origine (1001 est l'utilisateur appelant)
  Context: 'from-internal',      // Contexte Asterisk où l'appel sera traité
  Exten: '1002',                 // Extension à appeler (1002 ici)
  Priority: 1,                   // Priorité pour l'exécution de l'appel
  CallerID: '"Test AMI" <1001>'  // ID de l'appelant à afficher
}, (err, res) => {
  if (err) {
    console.error('Erreur de commande AMI', err); // Si l'appel échoue
  } else {
    console.log('Réponse AMI :', res); // Réponse d'Asterisk après la tentative d'appel
  }
});

// Optionnel : Écoute des événements pour voir ce qui se passe dans Asterisk
ami.on('managerevent', (event) => {
  console.log('Événement AMI reçu :', event); // Afficher tous les événements AMI en temps réel
});
