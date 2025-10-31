import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour la configuration complète d'une queue
 */
export class QueueConfigurationDto {
  @ApiProperty({ description: 'Nom de la queue' })
  name: string;

  @ApiProperty({ description: 'ID du tenant', required: false })
  tenant_id?: number;

  @ApiProperty({ description: 'Nom du tenant', required: false })
  tenant_name?: string;

  @ApiProperty({ description: 'Stratégie de distribution' })
  strategy: string;

  @ApiProperty({ description: 'Musique en attente', required: false })
  musiconhold?: string;

  @ApiProperty({ description: 'Contexte', required: false })
  context?: string;

  @ApiProperty({ description: 'Timeout en secondes' })
  timeout: number;

  @ApiProperty({ description: 'Retry en secondes' })
  retry: number;

  @ApiProperty({ description: 'Wrapuptime en secondes' })
  wrapuptime: number;

  @ApiProperty({ description: 'Longueur maximale', required: false })
  maxlen?: number;

  @ApiProperty({ description: 'Poids' })
  weight: number;

  // Annonces
  @ApiProperty({ description: 'Fréquence des annonces', required: false })
  announce_frequency?: number;

  @ApiProperty({ description: 'Annoncer le temps d\'attente', required: false })
  announce_holdtime?: string;

  @ApiProperty({ description: 'Annoncer la position', required: false })
  announce_position?: string;

  @ApiProperty({ description: 'Arrondir les secondes', required: false })
  announce_round_seconds?: number;

  @ApiProperty({ description: 'Annonce périodique', required: false })
  periodic_announce?: string;

  @ApiProperty({ description: 'Fréquence annonce périodique', required: false })
  periodic_announce_frequency?: number;

  @ApiProperty({ description: 'Fréquence min annonce', required: false })
  min_announce_frequency?: number;

  @ApiProperty({ description: 'Annonce périodique aléatoire', required: false })
  random_periodic_announce?: boolean;

  @ApiProperty({ description: 'Annonce périodique relative', required: false })
  relative_periodic_announce?: boolean;

  // Messages sonores
  @ApiProperty({ description: 'Message "vous êtes le suivant"', required: false })
  queue_youarenext?: string;

  @ApiProperty({ description: 'Message "il y a"', required: false })
  queue_thereare?: string;

  @ApiProperty({ description: 'Message "appels en attente"', required: false })
  queue_callswaiting?: string;

  @ApiProperty({ description: 'Message "temps d\'attente"', required: false })
  queue_holdtime?: string;

  @ApiProperty({ description: 'Message "minutes"', required: false })
  queue_minutes?: string;

  @ApiProperty({ description: 'Message "secondes"', required: false })
  queue_seconds?: string;

  @ApiProperty({ description: 'Message "merci"', required: false })
  queue_thankyou?: string;

  @ApiProperty({ description: 'Message "rapport d\'attente"', required: false })
  queue_reporthold?: string;

  // Monitoring
  @ApiProperty({ description: 'Type de monitoring', required: false })
  monitor_type?: string;

  @ApiProperty({ description: 'Format de monitoring', required: false })
  monitor_format?: string;

  // Autopause
  @ApiProperty({ description: 'Auto pause', required: false })
  autopause?: boolean;

  @ApiProperty({ description: 'Délai auto pause', required: false })
  autopausedelay?: number;

  @ApiProperty({ description: 'Auto pause si occupé', required: false })
  autopausebusy?: boolean;

  @ApiProperty({ description: 'Auto pause si indisponible', required: false })
  autopauseunavail?: boolean;

  // Paramètres avancés
  @ApiProperty({ description: 'Niveau de service', required: false })
  servicelevel?: number;

  @ApiProperty({ description: 'Joindre si vide', required: false })
  joinempty?: string;

  @ApiProperty({ description: 'Quitter si vide', required: false })
  leavewhenempty?: string;

  @ApiProperty({ description: 'Redémarrer le timeout', required: false })
  timeoutrestart?: boolean;

  @ApiProperty({ description: 'Sonner si en utilisation', required: false })
  ringinuse?: boolean;

  @ApiProperty({ description: 'Auto remplissage', required: false })
  autofill?: boolean;

  @ApiProperty({ description: 'Définir variable d\'interface', required: false })
  setinterfacevar?: boolean;

  @ApiProperty({ description: 'Définir variable d\'entrée', required: false })
  setqueueentryvar?: boolean;

  @ApiProperty({ description: 'Définir variable de queue', required: false })
  setqueuevar?: boolean;
}

/**
 * DTO pour les statistiques en temps réel
 */
export class QueueStatisticsDto {
  @ApiProperty({ description: 'Appels en attente' })
  calls_waiting: number;

  @ApiProperty({ description: 'Appels complétés' })
  calls_completed: number;

  @ApiProperty({ description: 'Appels abandonnés' })
  calls_abandoned: number;

  @ApiProperty({ description: 'Total des appels' })
  calls_total: number;

  @ApiProperty({ description: 'Temps d\'attente moyen' })
  avg_holdtime: number;

  @ApiProperty({ description: 'Temps de conversation moyen' })
  avg_talktime: number;

  @ApiProperty({ description: 'Niveau de service' })
  service_level: number;

  @ApiProperty({ description: 'Performance du niveau de service' })
  service_level_perf: number;

  @ApiProperty({ description: 'Taux d\'abandon' })
  abandonment_rate: number;
}

/**
 * DTO pour un membre de la queue
 */
export class QueueMemberDetailDto {
  @ApiProperty({ description: 'Interface du membre' })
  interface: string;

  @ApiProperty({ description: 'Nom du membre', required: false })
  member_name?: string;

  @ApiProperty({ description: 'Statut du membre' })
  status: string;

  @ApiProperty({ description: 'Membre en pause' })
  paused: boolean;

  @ApiProperty({ description: 'Raison de la pause', required: false })
  paused_reason?: string;

  @ApiProperty({ description: 'Pénalité' })
  penalty: number;

  @ApiProperty({ description: 'Appels pris' })
  calls_taken: number;

  @ApiProperty({ description: 'Dernier appel (timestamp)' })
  last_call: number;

  @ApiProperty({ description: 'En appel' })
  in_call: boolean;

  @ApiProperty({ description: 'Interface d\'état', required: false })
  state_interface?: string;
}

/**
 * DTO pour les membres de la queue
 */
export class QueueMembersDto {
  @ApiProperty({ description: 'Nombre total de membres' })
  total: number;

  @ApiProperty({ description: 'Nombre de membres disponibles' })
  available: number;

  @ApiProperty({ description: 'Nombre de membres en appel' })
  in_call: number;

  @ApiProperty({ description: 'Nombre de membres en pause' })
  paused: number;

  @ApiProperty({ description: 'Nombre de membres indisponibles' })
  unavailable: number;

  @ApiProperty({ description: 'Liste des membres', type: [QueueMemberDetailDto] })
  list: QueueMemberDetailDto[];
}

/**
 * DTO pour l'état global de la queue
 */
export class QueueStateDto {
  @ApiProperty({ description: 'Queue active (avec des appels)' })
  is_active: boolean;

  @ApiProperty({ description: 'A des agents disponibles' })
  has_available_agents: boolean;

  @ApiProperty({ description: 'Peut accepter des appels' })
  can_accept_calls: boolean;

  @ApiProperty({
    description: 'État visuel',
    enum: ['idle', 'active', 'busy', 'critical']
  })
  visual_state: 'idle' | 'active' | 'busy' | 'critical';
}

/**
 * DTO pour les métadonnées
 */
export class QueueMetaDto {
  @ApiProperty({ description: 'AMI connecté' })
  ami_connected: boolean;

  @ApiProperty({ description: 'Date de récupération' })
  retrieved_at: string;
}

/**
 * DTO principal pour les détails complets d'une queue
 */
export class QueueDetailsDto {
  @ApiProperty({ description: 'Configuration complète de la queue', type: QueueConfigurationDto })
  configuration: QueueConfigurationDto;

  @ApiProperty({ description: 'Statistiques en temps réel', type: QueueStatisticsDto })
  statistics: QueueStatisticsDto;

  @ApiProperty({ description: 'Membres de la queue', type: QueueMembersDto })
  members: QueueMembersDto;

  @ApiProperty({ description: 'État global de la queue', type: QueueStateDto })
  state: QueueStateDto;

  @ApiProperty({ description: 'Métadonnées', type: QueueMetaDto })
  meta: QueueMetaDto;
}
