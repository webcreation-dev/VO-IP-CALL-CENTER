import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour les informations endpoint d'un membre
 */
export class MemberEndpointDto {
  @ApiProperty({ description: 'ID de l\'endpoint' })
  id: string;

  @ApiProperty({ description: 'ID du tenant', required: false })
  tenant_id?: number;

  @ApiProperty({ description: 'Nom du tenant', required: false })
  tenant_name?: string;

  @ApiProperty({ description: 'Transport', required: false })
  transport?: string;

  @ApiProperty({ description: 'Contexte', required: false })
  context?: string;

  @ApiProperty({ description: 'Endpoint enregistré' })
  registered: boolean;

  @ApiProperty({ description: 'État du device', required: false })
  device_state?: string;

  @ApiProperty({ description: 'Adresse IP', required: false })
  ip_address?: string;
}

/**
 * DTO pour un membre enrichi avec toutes les données endpoint
 */
export class EnrichedMemberDto {
  // === Données de base du membre ===
  @ApiProperty({ description: 'Interface du membre (ex: PJSIP/101)' })
  interface: string;

  @ApiProperty({ description: 'Nom du membre', required: false })
  member_name?: string;

  @ApiProperty({ description: 'Nom de la queue' })
  queue_name: string;

  // === Statut détaillé ===
  @ApiProperty({ description: 'Statut du membre' })
  status: string;

  @ApiProperty({
    description: 'Statut détaillé',
    enum: ['offline', 'paused', 'in_call', 'available', 'unknown']
  })
  detailed_status: 'offline' | 'paused' | 'in_call' | 'available' | 'unknown';

  @ApiProperty({ description: 'Membre en pause' })
  paused: boolean;

  @ApiProperty({ description: 'Raison de la pause', required: false })
  paused_reason?: string;

  @ApiProperty({ description: 'Membre en appel' })
  in_call: boolean;

  // === Priorité et config ===
  @ApiProperty({ description: 'Pénalité du membre' })
  penalty: number;

  // === Statistiques d'appels ===
  @ApiProperty({ description: 'Nombre d\'appels pris' })
  calls_taken: number;

  @ApiProperty({ description: 'Timestamp du dernier appel' })
  last_call: number;

  @ApiProperty({ description: 'Temps depuis le dernier appel en secondes', required: false })
  time_since_last_call?: number;

  // === Informations endpoint ===
  @ApiProperty({ description: 'Données de l\'endpoint', type: MemberEndpointDto, required: false })
  endpoint?: MemberEndpointDto;

  // === Métadonnées ===
  @ApiProperty({ description: 'Données AMI disponibles' })
  ami_data_available: boolean;

  @ApiProperty({ description: 'Date d\'enrichissement' })
  enriched_at: string;
}
