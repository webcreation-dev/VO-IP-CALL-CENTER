import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour le résultat du rechargement d'une queue
 */
export class QueueReloadResultDto {
  @ApiProperty({ description: 'Succès de l\'opération' })
  success: boolean;

  @ApiProperty({ description: 'Nom de la queue rechargée' })
  queue_name: string;

  @ApiProperty({ description: 'Message de résultat' })
  message: string;

  @ApiProperty({ description: 'Réponse AMI', required: false })
  response?: any;

  @ApiProperty({ description: 'Date du rechargement' })
  reloaded_at: string;
}
