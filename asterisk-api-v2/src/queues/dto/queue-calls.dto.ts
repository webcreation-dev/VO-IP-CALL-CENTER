import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour un appel en attente dans la queue
 */
export class WaitingCallDto {
  @ApiProperty({ description: 'Position dans la queue' })
  position: number;

  @ApiProperty({ description: 'Canal de l\'appel' })
  channel: string;

  @ApiProperty({ description: 'Numéro de l\'appelant' })
  caller_id_num: string;

  @ApiProperty({ description: 'Nom de l\'appelant' })
  caller_id_name: string;

  @ApiProperty({ description: 'Temps d\'attente en secondes' })
  wait_time: number;

  @ApiProperty({ description: 'Priorité de l\'appel' })
  priority: number;
}

/**
 * DTO pour la liste des appels en attente d'une queue
 */
export class QueueCallsDto {
  @ApiProperty({ description: 'Nom de la queue' })
  queue_name: string;

  @ApiProperty({ description: 'Nombre d\'appels en attente' })
  calls_count: number;

  @ApiProperty({ description: 'Liste des appels en attente', type: [WaitingCallDto] })
  calls: WaitingCallDto[];

  @ApiProperty({ description: 'Date de récupération' })
  retrieved_at: string;
}
