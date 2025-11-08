// entities/ivr-option.entity.ts (version améliorée)
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { IvrMenu } from './ivr-menu.entity';
import type { ActionConfig } from '../interfaces/action-config.interface';
import { Tenant } from '../../core/database/entities/tenant.entity';

@Entity('ivr_options')
export class IvrOption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  menu_id: number;

  @Column({ type: 'integer' })
  tenant_id: number;

  @Column({ length: 1 })
  digit: string;

  @Column({ type: 'jsonb' })
  action: ActionConfig;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 0 })
  priority: number;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  // Relations
  @ManyToOne(() => IvrMenu, (menu) => menu.options, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_id' })
  menu: IvrMenu;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  // Méthode helper pour obtenir un résumé lisible de l'action
  getActionSummary(): string {
    switch (this.action.type) {
      case 'queue':
        return `Transférer vers la file d'attente`;
      case 'endpoint':
        return `Appeler l'endpoint`;
      case 'submenu':
        return `Ouvrir le sous-menu`;
      case 'playback':
        return `Jouer ${this.action.sounds.length} fichier(s) audio`;
      case 'hangup':
        return `Raccrocher`;
      case 'voicemail':
        return `Messagerie vocale`;
      case 'callback':
        return `Demander un rappel`;
      case 'external_api':
        return `Appeler une API externe`;
      default:
        return `Action inconnue`;
    }
  }
}