import { EnumCategory } from './interfaces/metadata.interface';

/**
 * All enum categories with translations and UI metadata
 * This is the single source of truth for all enum values in the system
 */
export const ENUM_CATEGORIES: EnumCategory[] = [
  // ========================================
  // AUTHENTICATION & AUTHORIZATION
  // ========================================
  {
    category: 'user-roles',
    label: { en: 'User Roles', fr: 'Rôles Utilisateurs' },
    description: {
      en: 'Available roles for authentication and authorization',
      fr: 'Rôles disponibles pour l\'authentification et l\'autorisation',
    },
    module: 'authentication',
    values: [
      {
        key: 'admin',
        label: { en: 'Administrator', fr: 'Administrateur' },
        description: {
          en: 'Global system administrator with full access to all tenants',
          fr: 'Administrateur système global avec accès complet à tous les locataires',
        },
        metadata: { color: '#e74c3c', icon: 'shield-check', badge: 'danger', order: 1 },
      },
      {
        key: 'tenant_admin',
        label: { en: 'Tenant Administrator', fr: 'Administrateur Locataire' },
        description: {
          en: 'Administrator for a specific tenant/organization',
          fr: 'Administrateur pour un locataire/organisation spécifique',
        },
        metadata: { color: '#3498db', icon: 'building-user', badge: 'info', order: 2 },
      },
      {
        key: 'supervisor',
        label: { en: 'Supervisor', fr: 'Superviseur' },
        description: {
          en: 'Call center supervisor with monitoring and management capabilities',
          fr: 'Superviseur de centre d\'appels avec capacités de surveillance et gestion',
        },
        metadata: { color: '#9b59b6', icon: 'user-tie', badge: 'info', order: 3 },
      },
      {
        key: 'agent',
        label: { en: 'Agent', fr: 'Agent' },
        description: {
          en: 'Call center agent with basic call handling capabilities',
          fr: 'Agent de centre d\'appels avec capacités de base de traitement d\'appels',
        },
        metadata: { color: '#27ae60', icon: 'headset', badge: 'success', order: 4 },
      },
    ],
  },

  // ========================================
  // SYSTEM & PAGINATION
  // ========================================
  {
    category: 'sort-orders',
    label: { en: 'Sort Orders', fr: 'Ordres de Tri' },
    description: {
      en: 'Available sort orders for list pagination',
      fr: 'Ordres de tri disponibles pour la pagination des listes',
    },
    module: 'common',
    values: [
      {
        key: 'ASC',
        label: { en: 'Ascending', fr: 'Croissant' },
        description: {
          en: 'Sort in ascending order (A-Z, 0-9, oldest first)',
          fr: 'Trier par ordre croissant (A-Z, 0-9, plus ancien en premier)',
        },
        metadata: { icon: 'arrow-up', badge: 'secondary', order: 1 },
      },
      {
        key: 'DESC',
        label: { en: 'Descending', fr: 'Décroissant' },
        description: {
          en: 'Sort in descending order (Z-A, 9-0, newest first)',
          fr: 'Trier par ordre décroissant (Z-A, 9-0, plus récent en premier)',
        },
        metadata: { icon: 'arrow-down', badge: 'secondary', order: 2 },
      },
    ],
  },

  {
    category: 'boolean-options',
    label: { en: 'Boolean Options', fr: 'Options Booléennes' },
    description: {
      en: 'Yes/No configuration options',
      fr: 'Options de configuration Oui/Non',
    },
    module: 'common',
    values: [
      {
        key: 'yes',
        label: { en: 'Yes', fr: 'Oui' },
        description: { en: 'Enable/activate option', fr: 'Activer/activer l\'option' },
        metadata: { color: '#27ae60', icon: 'check', badge: 'success', order: 1 },
      },
      {
        key: 'no',
        label: { en: 'No', fr: 'Non' },
        description: { en: 'Disable/deactivate option', fr: 'Désactiver/désactiver l\'option' },
        metadata: { color: '#95a5a6', icon: 'times', badge: 'secondary', order: 2 },
      },
    ],
  },

  // ========================================
  // QUEUES
  // ========================================
  {
    category: 'queue-strategies',
    label: { en: 'Queue Strategies', fr: 'Stratégies de File' },
    description: {
      en: 'Distribution strategies for queue calls',
      fr: 'Stratégies de distribution pour les appels en file',
    },
    module: 'queues',
    values: [
      {
        key: 'ringall',
        label: { en: 'Ring All', fr: 'Sonner Tous' },
        description: {
          en: 'Ring all available members simultaneously',
          fr: 'Faire sonner tous les membres disponibles simultanément',
        },
        metadata: { icon: 'bell-concierge', badge: 'info', order: 1 },
      },
      {
        key: 'leastrecent',
        label: { en: 'Least Recent', fr: 'Moins Récent' },
        description: {
          en: 'Ring the member who least recently answered a call',
          fr: 'Faire sonner le membre qui a le moins récemment répondu à un appel',
        },
        metadata: { icon: 'clock', badge: 'info', order: 2 },
      },
      {
        key: 'fewestcalls',
        label: { en: 'Fewest Calls', fr: 'Moins d\'Appels' },
        description: {
          en: 'Ring the member with the fewest completed calls',
          fr: 'Faire sonner le membre avec le moins d\'appels terminés',
        },
        metadata: { icon: 'chart-bar', badge: 'info', order: 3 },
      },
      {
        key: 'random',
        label: { en: 'Random', fr: 'Aléatoire' },
        description: {
          en: 'Ring a random available member',
          fr: 'Faire sonner un membre disponible aléatoirement',
        },
        metadata: { icon: 'shuffle', badge: 'info', order: 4 },
      },
      {
        key: 'rrmemory',
        label: { en: 'Round Robin Memory', fr: 'Tourniquet avec Mémoire' },
        description: {
          en: 'Round robin with memory of last member called',
          fr: 'Tourniquet avec mémorisation du dernier membre appelé',
        },
        metadata: { icon: 'rotate', badge: 'info', order: 5 },
      },
      {
        key: 'linear',
        label: { en: 'Linear', fr: 'Linéaire' },
        description: {
          en: 'Ring members in order from configuration',
          fr: 'Faire sonner les membres dans l\'ordre de la configuration',
        },
        metadata: { icon: 'list-ol', badge: 'info', order: 6 },
      },
      {
        key: 'wrandom',
        label: { en: 'Weighted Random', fr: 'Aléatoire Pondéré' },
        description: {
          en: 'Random with penalty-based weighting',
          fr: 'Aléatoire avec pondération basée sur la pénalité',
        },
        metadata: { icon: 'weight-scale', badge: 'info', order: 7 },
      },
    ],
  },

  {
    category: 'queue-member-status',
    label: { en: 'Queue Member Status', fr: 'Statut Membre de File' },
    description: {
      en: 'Status codes for queue members (AMI)',
      fr: 'Codes de statut pour les membres de file (AMI)',
    },
    module: 'queues',
    values: [
      {
        key: 'UNKNOWN',
        label: { en: 'Unknown', fr: 'Inconnu' },
        description: { en: 'Status unknown', fr: 'Statut inconnu' },
        numericValue: -1,
        metadata: { color: '#95a5a6', icon: 'question', badge: 'secondary', order: 1 },
      },
      {
        key: 'NOT_IN_USE',
        label: { en: 'Not In Use', fr: 'Non Utilisé' },
        description: { en: 'Device available', fr: 'Appareil disponible' },
        numericValue: 0,
        metadata: { color: '#27ae60', icon: 'check-circle', badge: 'success', order: 2 },
      },
      {
        key: 'IN_USE',
        label: { en: 'In Use', fr: 'En Utilisation' },
        description: { en: 'Device in active call', fr: 'Appareil en appel actif' },
        numericValue: 1,
        metadata: { color: '#f39c12', icon: 'phone', badge: 'warning', order: 3 },
      },
      {
        key: 'BUSY',
        label: { en: 'Busy', fr: 'Occupé' },
        description: { en: 'Device busy', fr: 'Appareil occupé' },
        numericValue: 2,
        metadata: { color: '#e74c3c', icon: 'phone-slash', badge: 'danger', order: 4 },
      },
      {
        key: 'INVALID',
        label: { en: 'Invalid', fr: 'Invalide' },
        description: { en: 'Invalid device', fr: 'Appareil invalide' },
        numericValue: 3,
        metadata: { color: '#c0392b', icon: 'ban', badge: 'danger', order: 5 },
      },
      {
        key: 'UNAVAILABLE',
        label: { en: 'Unavailable', fr: 'Indisponible' },
        description: { en: 'Device unavailable/offline', fr: 'Appareil indisponible/hors ligne' },
        numericValue: 4,
        metadata: { color: '#7f8c8d', icon: 'power-off', badge: 'secondary', order: 6 },
      },
      {
        key: 'RINGING',
        label: { en: 'Ringing', fr: 'Sonnerie' },
        description: { en: 'Device ringing', fr: 'Appareil en sonnerie' },
        numericValue: 5,
        metadata: { color: '#3498db', icon: 'bell', badge: 'info', order: 7 },
      },
      {
        key: 'RING_AND_IN_USE',
        label: { en: 'Ring and In Use', fr: 'Sonnerie et En Utilisation' },
        description: {
          en: 'Device ringing while in another call',
          fr: 'Appareil en sonnerie pendant un autre appel',
        },
        numericValue: 6,
        metadata: { color: '#9b59b6', icon: 'phone-plus', badge: 'info', order: 8 },
      },
      {
        key: 'ON_HOLD',
        label: { en: 'On Hold', fr: 'En Attente' },
        description: { en: 'Call on hold', fr: 'Appel en attente' },
        numericValue: 7,
        metadata: { color: '#f39c12', icon: 'pause', badge: 'warning', order: 9 },
      },
    ],
  },

  {
    category: 'paused-status',
    label: { en: 'Paused Status', fr: 'Statut Pause' },
    description: {
      en: 'Pause status for queue members',
      fr: 'Statut de pause pour les membres de file',
    },
    module: 'queues',
    values: [
      {
        key: 'NOT_PAUSED',
        label: { en: 'Not Paused', fr: 'Pas en Pause' },
        description: { en: 'Member active', fr: 'Membre actif' },
        numericValue: 0,
        metadata: { color: '#27ae60', icon: 'play', badge: 'success', order: 1 },
      },
      {
        key: 'PAUSED',
        label: { en: 'Paused', fr: 'En Pause' },
        description: { en: 'Member paused', fr: 'Membre en pause' },
        numericValue: 1,
        metadata: { color: '#f39c12', icon: 'pause', badge: 'warning', order: 2 },
      },
    ],
  },

  // ========================================
  // CHANNELS & CALLS
  // ========================================
  {
    category: 'channel-states',
    label: { en: 'Channel States', fr: 'États des Canaux' },
    description: {
      en: 'Possible states for active channels',
      fr: 'États possibles pour les canaux actifs',
    },
    module: 'channels',
    values: [
      {
        key: 'Down',
        label: { en: 'Down', fr: 'Inactif' },
        description: { en: 'Channel offline', fr: 'Canal hors ligne' },
        metadata: { color: '#95a5a6', icon: 'circle', badge: 'secondary', order: 1 },
      },
      {
        key: 'Rsrvd',
        label: { en: 'Reserved', fr: 'Réservé' },
        description: { en: 'Channel reserved', fr: 'Canal réservé' },
        metadata: { color: '#3498db', icon: 'lock', badge: 'info', order: 2 },
      },
      {
        key: 'OffHook',
        label: { en: 'Off Hook', fr: 'Décroché' },
        description: { en: 'Off hook (analog)', fr: 'Décroché (analogique)' },
        metadata: { color: '#f39c12', icon: 'phone-volume', badge: 'warning', order: 3 },
      },
      {
        key: 'Dialing',
        label: { en: 'Dialing', fr: 'Composition' },
        description: { en: 'Actively dialing', fr: 'Composition en cours' },
        metadata: { color: '#3498db', icon: 'phone-arrow-up-right', badge: 'info', order: 4 },
      },
      {
        key: 'Ring',
        label: { en: 'Ring', fr: 'Sonnerie Entrante' },
        description: { en: 'Incoming ring', fr: 'Sonnerie entrante' },
        metadata: { color: '#9b59b6', icon: 'bell', badge: 'info', order: 5 },
      },
      {
        key: 'Ringing',
        label: { en: 'Ringing', fr: 'Sonnerie Sortante' },
        description: { en: 'Outgoing ring', fr: 'Sonnerie sortante' },
        metadata: { color: '#9b59b6', icon: 'phone-volume', badge: 'info', order: 6 },
      },
      {
        key: 'Up',
        label: { en: 'Up', fr: 'Actif' },
        description: { en: 'Active call', fr: 'Appel actif' },
        metadata: { color: '#27ae60', icon: 'phone', badge: 'success', order: 7 },
      },
      {
        key: 'Busy',
        label: { en: 'Busy', fr: 'Occupé' },
        description: { en: 'Line busy', fr: 'Ligne occupée' },
        metadata: { color: '#e74c3c', icon: 'phone-slash', badge: 'danger', order: 8 },
      },
    ],
  },

  {
    category: 'call-directions',
    label: { en: 'Call Directions', fr: 'Sens d\'Appel' },
    description: {
      en: 'Direction of calls (inbound/outbound)',
      fr: 'Direction des appels (entrant/sortant)',
    },
    module: 'channels',
    values: [
      {
        key: 'inbound',
        label: { en: 'Inbound', fr: 'Entrant' },
        description: { en: 'Incoming call', fr: 'Appel entrant' },
        metadata: { color: '#3498db', icon: 'phone-arrow-down-left', badge: 'info', order: 1 },
      },
      {
        key: 'outbound',
        label: { en: 'Outbound', fr: 'Sortant' },
        description: { en: 'Outgoing call', fr: 'Appel sortant' },
        metadata: { color: '#27ae60', icon: 'phone-arrow-up-right', badge: 'success', order: 2 },
      },
    ],
  },

  {
    category: 'mute-directions',
    label: { en: 'Mute Directions', fr: 'Directions de Sourdine' },
    description: {
      en: 'Audio mute directions',
      fr: 'Directions de mise en sourdine audio',
    },
    module: 'channels',
    values: [
      {
        key: 'in',
        label: { en: 'Inbound', fr: 'Entrant' },
        description: {
          en: 'Mute inbound audio (agent cannot hear caller)',
          fr: 'Couper l\'audio entrant (agent ne peut entendre l\'appelant)',
        },
        metadata: { icon: 'volume-xmark', badge: 'warning', order: 1 },
      },
      {
        key: 'out',
        label: { en: 'Outbound', fr: 'Sortant' },
        description: {
          en: 'Mute outbound audio (caller cannot hear agent)',
          fr: 'Couper l\'audio sortant (appelant ne peut entendre l\'agent)',
        },
        metadata: { icon: 'microphone-slash', badge: 'warning', order: 2 },
      },
      {
        key: 'both',
        label: { en: 'Both', fr: 'Les Deux' },
        description: {
          en: 'Mute both directions',
          fr: 'Couper les deux directions',
        },
        metadata: { icon: 'ban', badge: 'danger', order: 3 },
      },
    ],
  },

  // ========================================
  // ENDPOINTS & DEVICES
  // ========================================
  {
    category: 'device-states',
    label: { en: 'Device States', fr: 'États des Appareils' },
    description: {
      en: 'Device/endpoint availability states',
      fr: 'États de disponibilité des appareils/endpoints',
    },
    module: 'endpoints',
    values: [
      {
        key: 'Unknown',
        label: { en: 'Unknown', fr: 'Inconnu' },
        description: { en: 'State unknown', fr: 'État inconnu' },
        metadata: { color: '#95a5a6', icon: 'question', badge: 'secondary', order: 1 },
      },
      {
        key: 'Not in use',
        label: { en: 'Not In Use', fr: 'Non Utilisé' },
        description: { en: 'Device available', fr: 'Appareil disponible' },
        metadata: { color: '#27ae60', icon: 'check-circle', badge: 'success', order: 2 },
      },
      {
        key: 'In use',
        label: { en: 'In Use', fr: 'En Utilisation' },
        description: { en: 'Device in call', fr: 'Appareil en appel' },
        metadata: { color: '#f39c12', icon: 'phone', badge: 'warning', order: 3 },
      },
      {
        key: 'Busy',
        label: { en: 'Busy', fr: 'Occupé' },
        description: { en: 'Device busy', fr: 'Appareil occupé' },
        metadata: { color: '#e74c3c', icon: 'phone-slash', badge: 'danger', order: 4 },
      },
      {
        key: 'Invalid',
        label: { en: 'Invalid', fr: 'Invalide' },
        description: { en: 'Invalid device', fr: 'Appareil invalide' },
        metadata: { color: '#c0392b', icon: 'ban', badge: 'danger', order: 5 },
      },
      {
        key: 'Unavailable',
        label: { en: 'Unavailable', fr: 'Indisponible' },
        description: { en: 'Device unavailable', fr: 'Appareil indisponible' },
        metadata: { color: '#7f8c8d', icon: 'power-off', badge: 'secondary', order: 6 },
      },
      {
        key: 'Ringing',
        label: { en: 'Ringing', fr: 'Sonnerie' },
        description: { en: 'Device ringing', fr: 'Appareil en sonnerie' },
        metadata: { color: '#3498db', icon: 'bell', badge: 'info', order: 7 },
      },
      {
        key: 'Ring+Inuse',
        label: { en: 'Ring + In Use', fr: 'Sonnerie + En Utilisation' },
        description: { en: 'Ringing and in call', fr: 'Sonnerie et en appel' },
        metadata: { color: '#9b59b6', icon: 'phone-plus', badge: 'info', order: 8 },
      },
      {
        key: 'On Hold',
        label: { en: 'On Hold', fr: 'En Attente' },
        description: { en: 'Call on hold', fr: 'Appel en attente' },
        metadata: { color: '#f39c12', icon: 'pause', badge: 'warning', order: 9 },
      },
    ],
  },

  {
    category: 'endpoint-device-states',
    label: { en: 'Endpoint Device States', fr: 'États d\'Appareil Endpoint' },
    description: {
      en: 'Device states for endpoint filtering',
      fr: 'États d\'appareil pour le filtrage d\'endpoints',
    },
    module: 'endpoints',
    values: [
      {
        key: 'UNKNOWN',
        label: { en: 'Unknown', fr: 'Inconnu' },
        description: { en: 'Unknown state', fr: 'État inconnu' },
        metadata: { color: '#95a5a6', icon: 'question', badge: 'secondary', order: 1 },
      },
      {
        key: 'NOT_INUSE',
        label: { en: 'Not In Use', fr: 'Non Utilisé' },
        description: { en: 'Available', fr: 'Disponible' },
        metadata: { color: '#27ae60', icon: 'check-circle', badge: 'success', order: 2 },
      },
      {
        key: 'INUSE',
        label: { en: 'In Use', fr: 'En Utilisation' },
        description: { en: 'Active call', fr: 'Appel actif' },
        metadata: { color: '#f39c12', icon: 'phone', badge: 'warning', order: 3 },
      },
      {
        key: 'BUSY',
        label: { en: 'Busy', fr: 'Occupé' },
        description: { en: 'Busy', fr: 'Occupé' },
        metadata: { color: '#e74c3c', icon: 'phone-slash', badge: 'danger', order: 4 },
      },
      {
        key: 'INVALID',
        label: { en: 'Invalid', fr: 'Invalide' },
        description: { en: 'Invalid', fr: 'Invalide' },
        metadata: { color: '#c0392b', icon: 'ban', badge: 'danger', order: 5 },
      },
      {
        key: 'UNAVAILABLE',
        label: { en: 'Unavailable', fr: 'Indisponible' },
        description: { en: 'Unavailable', fr: 'Indisponible' },
        metadata: { color: '#7f8c8d', icon: 'power-off', badge: 'secondary', order: 6 },
      },
      {
        key: 'RINGING',
        label: { en: 'Ringing', fr: 'Sonnerie' },
        description: { en: 'Ringing', fr: 'Sonnerie' },
        metadata: { color: '#3498db', icon: 'bell', badge: 'info', order: 7 },
      },
      {
        key: 'RINGINUSE',
        label: { en: 'Ring In Use', fr: 'Sonnerie En Utilisation' },
        description: { en: 'Ringing and in use', fr: 'Sonnerie et en utilisation' },
        metadata: { color: '#9b59b6', icon: 'phone-plus', badge: 'info', order: 8 },
      },
      {
        key: 'ONHOLD',
        label: { en: 'On Hold', fr: 'En Attente' },
        description: { en: 'On hold', fr: 'En attente' },
        metadata: { color: '#f39c12', icon: 'pause', badge: 'warning', order: 9 },
      },
    ],
  },

  {
    category: 'transport-protocols',
    label: { en: 'Transport Protocols', fr: 'Protocoles de Transport' },
    description: {
      en: 'SIP transport protocols',
      fr: 'Protocoles de transport SIP',
    },
    module: 'endpoints',
    values: [
      {
        key: 'udp',
        label: { en: 'UDP', fr: 'UDP' },
        description: {
          en: 'User Datagram Protocol (default)',
          fr: 'Protocole de Datagramme Utilisateur (par défaut)',
        },
        metadata: { icon: 'network-wired', badge: 'info', order: 1 },
      },
      {
        key: 'tcp',
        label: { en: 'TCP', fr: 'TCP' },
        description: {
          en: 'Transmission Control Protocol',
          fr: 'Protocole de Contrôle de Transmission',
        },
        metadata: { icon: 'network-wired', badge: 'info', order: 2 },
      },
      {
        key: 'tls',
        label: { en: 'TLS', fr: 'TLS' },
        description: {
          en: 'Transport Layer Security (encrypted)',
          fr: 'Sécurité de la Couche de Transport (chiffré)',
        },
        metadata: { color: '#27ae60', icon: 'lock', badge: 'success', order: 3 },
      },
      {
        key: 'ws',
        label: { en: 'WebSocket', fr: 'WebSocket' },
        description: {
          en: 'WebSocket protocol',
          fr: 'Protocole WebSocket',
        },
        metadata: { icon: 'globe', badge: 'info', order: 4 },
      },
      {
        key: 'wss',
        label: { en: 'WebSocket Secure', fr: 'WebSocket Sécurisé' },
        description: {
          en: 'WebSocket Secure (encrypted)',
          fr: 'WebSocket Sécurisé (chiffré)',
        },
        metadata: { color: '#27ae60', icon: 'lock', badge: 'success', order: 5 },
      },
    ],
  },

  {
    category: 'dtmf-modes',
    label: { en: 'DTMF Modes', fr: 'Modes DTMF' },
    description: {
      en: 'DTMF detection and transmission modes',
      fr: 'Modes de détection et transmission DTMF',
    },
    module: 'endpoints',
    values: [
      {
        key: 'rfc4733',
        label: { en: 'RFC 4733', fr: 'RFC 4733' },
        description: {
          en: 'RFC 4733 standard (RTP events)',
          fr: 'Standard RFC 4733 (événements RTP)',
        },
        metadata: { badge: 'success', order: 1 },
      },
      {
        key: 'inband',
        label: { en: 'In-Band', fr: 'En Bande' },
        description: {
          en: 'In-band audio tones',
          fr: 'Tonalités audio en bande',
        },
        metadata: { badge: 'info', order: 2 },
      },
      {
        key: 'info',
        label: { en: 'SIP INFO', fr: 'SIP INFO' },
        description: {
          en: 'SIP INFO method',
          fr: 'Méthode SIP INFO',
        },
        metadata: { badge: 'info', order: 3 },
      },
      {
        key: 'auto',
        label: { en: 'Auto', fr: 'Automatique' },
        description: {
          en: 'Automatic detection',
          fr: 'Détection automatique',
        },
        metadata: { badge: 'secondary', order: 4 },
      },
    ],
  },

  // ========================================
  // CDR & RECORDINGS
  // ========================================
  {
    category: 'call-dispositions',
    label: { en: 'Call Dispositions', fr: 'Dispositions d\'Appel' },
    description: {
      en: 'Call termination dispositions',
      fr: 'Dispositions de terminaison d\'appel',
    },
    module: 'cdr',
    values: [
      {
        key: 'ANSWERED',
        label: { en: 'Answered', fr: 'Répondu' },
        description: { en: 'Call answered', fr: 'Appel répondu' },
        metadata: { color: '#27ae60', icon: 'check-circle', badge: 'success', order: 1 },
      },
      {
        key: 'NO ANSWER',
        label: { en: 'No Answer', fr: 'Pas de Réponse' },
        description: { en: 'No answer', fr: 'Pas de réponse' },
        metadata: { color: '#f39c12', icon: 'phone-missed', badge: 'warning', order: 2 },
      },
      {
        key: 'BUSY',
        label: { en: 'Busy', fr: 'Occupé' },
        description: { en: 'Line busy', fr: 'Ligne occupée' },
        metadata: { color: '#e74c3c', icon: 'phone-slash', badge: 'danger', order: 3 },
      },
      {
        key: 'FAILED',
        label: { en: 'Failed', fr: 'Échoué' },
        description: { en: 'Call failed', fr: 'Appel échoué' },
        metadata: { color: '#c0392b', icon: 'xmark-circle', badge: 'danger', order: 4 },
      },
      {
        key: 'CONGESTION',
        label: { en: 'Congestion', fr: 'Congestion' },
        description: { en: 'Network congestion', fr: 'Congestion réseau' },
        metadata: { color: '#95a5a6', icon: 'triangle-exclamation', badge: 'secondary', order: 5 },
      },
    ],
  },

  {
    category: 'recording-formats',
    label: { en: 'Recording Formats', fr: 'Formats d\'Enregistrement' },
    description: {
      en: 'Audio recording file formats',
      fr: 'Formats de fichier d\'enregistrement audio',
    },
    module: 'recordings',
    values: [
      {
        key: 'wav',
        label: { en: 'WAV', fr: 'WAV' },
        description: {
          en: 'Waveform Audio File Format (uncompressed)',
          fr: 'Format de Fichier Audio Waveform (non compressé)',
        },
        metadata: { icon: 'file-audio', badge: 'success', order: 1 },
      },
      {
        key: 'gsm',
        label: { en: 'GSM', fr: 'GSM' },
        description: {
          en: 'GSM codec compressed audio',
          fr: 'Audio compressé codec GSM',
        },
        metadata: { icon: 'file-audio', badge: 'info', order: 2 },
      },
      {
        key: 'mp3',
        label: { en: 'MP3', fr: 'MP3' },
        description: {
          en: 'MPEG Audio Layer 3',
          fr: 'MPEG Audio Layer 3',
        },
        metadata: { icon: 'file-audio', badge: 'success', order: 3 },
      },
      {
        key: 'g722',
        label: { en: 'G.722', fr: 'G.722' },
        description: {
          en: 'G.722 wideband codec',
          fr: 'Codec large bande G.722',
        },
        metadata: { icon: 'file-audio', badge: 'info', order: 4 },
      },
      {
        key: 'ulaw',
        label: { en: 'U-Law', fr: 'U-Law' },
        description: {
          en: 'µ-law compression algorithm',
          fr: 'Algorithme de compression µ-law',
        },
        metadata: { icon: 'file-audio', badge: 'info', order: 5 },
      },
    ],
  },
];
