import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Check,
} from 'typeorm';
import { RolePreset } from './role-preset.entity';

/**
 * RolePresetRole Entity
 *
 * Représente un rôle individuel au sein d'un preset.
 * Définit le nom, le niveau hiérarchique et les permissions d'appel.
 *
 * Contraintes:
 * - Nom unique par preset
 * - Niveau unique par preset (1-10)
 * - Supprimé automatiquement si le preset est supprimé (CASCADE)
 */
@Entity('role_preset_roles')
@Check('"level" >= 1 AND "level" <= 10')
export class RolePresetRole {
  @PrimaryGeneratedColumn()
  id: number;

  // ========================================
  // Preset Association
  // ========================================

  @Column({ name: 'preset_id', type: 'integer' })
  presetId: number;

  @ManyToOne(() => RolePreset, (preset) => preset.roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'preset_id' })
  preset: RolePreset;

  // ========================================
  // Role Information
  // ========================================

  /**
   * Nom technique du rôle (ex: "agent", "supervisor")
   * Doit être unique dans le preset
   */
  @Column({ name: 'name', type: 'varchar', length: 50 })
  name: string;

  /**
   * Nom d'affichage du rôle (ex: "Agent", "Superviseur")
   */
  @Column({ name: 'display_name', type: 'varchar', length: 100 })
  displayName: string;

  /**
   * Description optionnelle du rôle
   */
  @Column({ name: 'description', type: 'text', nullable: true })
  description: string;

  /**
   * Niveau hiérarchique du rôle (1-10)
   * 1 = niveau le plus bas (Agent)
   * 10 = niveau le plus haut (Directeur)
   * Doit être unique dans le preset
   */
  @Column({ name: 'level', type: 'integer' })
  level: number;

  // ========================================
  // Call Permissions
  // ========================================

  /**
   * Autoriser les appels vers le même niveau hiérarchique
   */
  @Column({ name: 'can_call_same_level', type: 'boolean', default: true })
  canCallSameLevel: boolean;

  /**
   * Autoriser les appels vers les niveaux inférieurs
   */
  @Column({ name: 'can_call_lower_level', type: 'boolean', default: false })
  canCallLowerLevel: boolean;

  /**
   * Autoriser les appels vers les niveaux supérieurs
   */
  @Column({ name: 'can_call_higher_level', type: 'boolean', default: false })
  canCallHigherLevel: boolean;

  /**
   * Ordre d'affichage dans l'UI
   * Utilisé pour trier les rôles dans les listes
   */
  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;
}
