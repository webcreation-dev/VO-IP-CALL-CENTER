import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour une queue enrichie avec toutes les données AMI et DB
 */
export class EnrichedQueueDto {
  // === Données de base de la DB ===
  @ApiProperty({ description: 'Nom de la queue' })
  name: string;

  @ApiProperty({ description: 'ID du tenant', required: false })
  tenant_id?: number;

  @ApiProperty({ description: 'Musique en attente', required: false })
  musiconhold?: string;

  @ApiProperty({ description: 'Stratégie de distribution' })
  strategy: string;

  @ApiProperty({ description: 'Timeout en secondes' })
  timeout: number;

  @ApiProperty({ description: 'Temps de retry en secondes' })
  retry: number;

  @ApiProperty({ description: 'Temps de wrap-up en secondes' })
  wrapuptime: number;

  @ApiProperty({ description: 'Poids de la queue' })
  weight: number;

  @ApiProperty({ description: 'Autoriser le hangup', required: false })
  autofill?: boolean;

  @ApiProperty({ description: 'Nombre maximum d\'appels', required: false })
  maxlen?: number;

  @ApiProperty({ description: 'Comportement si plein', required: false })
  joinempty?: string;

  @ApiProperty({ description: 'Comportement si vide', required: false })
  leavewhenempty?: string;

  // === Statistiques d'appels AMI ===
  @ApiProperty({ description: 'Nombre d\'appels en attente' })
  calls_waiting: number;

  @ApiProperty({ description: 'Nombre d\'appels complétés' })
  calls_completed: number;

  @ApiProperty({ description: 'Nombre d\'appels abandonnés' })
  calls_abandoned: number;

  @ApiProperty({ description: 'Nombre total d\'appels traités' })
  calls_total: number;

  // === Temps et performance ===
  @ApiProperty({ description: 'Temps d\'attente moyen en secondes' })
  avg_holdtime: number;

  @ApiProperty({ description: 'Temps de conversation moyen en secondes' })
  avg_talktime: number;

  @ApiProperty({ description: 'Temps d\'attente le plus long (estimé) en secondes' })
  longest_wait_time: number;

  @ApiProperty({ description: 'Niveau de service configuré' })
  service_level: number;

  @ApiProperty({ description: 'Performance du niveau de service en %' })
  service_level_perf: number;

  // === Métriques calculées ===
  @ApiProperty({ description: 'Taux d\'abandon en %' })
  abandonment_rate: number;

  @ApiProperty({ description: 'Taux d\'utilisation des agents en %' })
  agent_utilization: number;

  // === Statistiques membres ===
  @ApiProperty({ description: 'Nombre total de membres' })
  members_total: number;

  @ApiProperty({ description: 'Nombre de membres disponibles' })
  members_available: number;

  @ApiProperty({ description: 'Nombre de membres en appel' })
  members_in_call: number;

  @ApiProperty({ description: 'Nombre de membres en pause' })
  members_paused: number;

  @ApiProperty({ description: 'Nombre de membres indisponibles' })
  members_unavailable: number;

  // === État visuel ===
  @ApiProperty({
    description: 'État visuel de la queue',
    enum: ['idle', 'active', 'busy', 'critical']
  })
  visual_state: 'idle' | 'active' | 'busy' | 'critical';

  // === Métadonnées AMI ===
  @ApiProperty({ description: 'AMI est connecté' })
  ami_connected: boolean;

  @ApiProperty({ description: 'Données AMI disponibles pour cette queue' })
  ami_data_available: boolean;

  // === Timestamp ===
  @ApiProperty({ description: 'Date et heure de l\'enrichissement' })
  enriched_at: string;
}
