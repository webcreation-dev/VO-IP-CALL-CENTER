import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour une queue dans le top busy
 */
export class TopBusyQueueDto {
  @ApiProperty({ description: 'Nom de la queue' })
  name: string;

  @ApiProperty({ description: 'Nombre d\'appels en attente' })
  calls_waiting: number;

  @ApiProperty({ description: 'Temps d\'attente le plus long' })
  longest_wait_time: number;

  @ApiProperty({ description: 'Nombre de membres disponibles' })
  members_available: number;
}

/**
 * DTO pour les statistiques globales de toutes les queues
 */
export class GlobalQueueStatsDto {
  // === Compteurs de base ===
  @ApiProperty({ description: 'Nombre total de queues' })
  total_queues: number;

  @ApiProperty({ description: 'Nombre total d\'appels en attente' })
  total_calls_waiting: number;

  @ApiProperty({ description: 'Nombre total d\'appels complétés' })
  total_calls_completed: number;

  @ApiProperty({ description: 'Nombre total d\'appels abandonnés' })
  total_calls_abandoned: number;

  @ApiProperty({ description: 'Nombre total d\'appels traités' })
  total_calls_handled: number;

  // === Statistiques membres globales ===
  @ApiProperty({ description: 'Nombre total de membres' })
  total_members: number;

  @ApiProperty({ description: 'Nombre de membres disponibles' })
  members_available: number;

  @ApiProperty({ description: 'Nombre de membres en appel' })
  members_in_call: number;

  @ApiProperty({ description: 'Nombre de membres en pause' })
  members_paused: number;

  @ApiProperty({ description: 'Nombre de membres indisponibles' })
  members_unavailable: number;

  // === Métriques de performance globales ===
  @ApiProperty({ description: 'Temps d\'attente moyen global en secondes' })
  avg_holdtime_global: number;

  @ApiProperty({ description: 'Temps de conversation moyen global en secondes' })
  avg_talktime_global: number;

  @ApiProperty({ description: 'Temps d\'attente le plus long global en secondes' })
  longest_wait_time_global: number;

  @ApiProperty({ description: 'Taux d\'abandon global en %' })
  global_abandonment_rate: number;

  @ApiProperty({ description: 'Taux d\'utilisation global des agents en %' })
  global_agent_utilization: number;

  // === Répartition par état visuel ===
  @ApiProperty({ description: 'Nombre de queues en état idle' })
  queues_idle: number;

  @ApiProperty({ description: 'Nombre de queues en état active' })
  queues_active: number;

  @ApiProperty({ description: 'Nombre de queues en état busy' })
  queues_busy: number;

  @ApiProperty({ description: 'Nombre de queues en état critical' })
  queues_critical: number;

  // === Top queues ===
  @ApiProperty({
    description: 'Top 5 des queues les plus occupées',
    type: [TopBusyQueueDto]
  })
  top_busy_queues: TopBusyQueueDto[];

  // === Métadonnées ===
  @ApiProperty({ description: 'AMI est connecté' })
  ami_connected: boolean;

  @ApiProperty({ description: 'Date et heure du calcul' })
  calculated_at: string;

  @ApiProperty({ description: 'ID du tenant filtré', required: false })
  tenant_id?: number;
}
