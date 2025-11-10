import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RolePresetRole } from './role-preset-role.entity';

/**
 * RolePreset Entity
 *
 * Représente un preset (template) de hiérarchie de rôles qui peut être appliqué
 * lors de la création d'un contexte.
 *
 * Gestion :
 * - Créé/modifié/supprimé uniquement par ADMIN
 * - Visible et utilisable par tous les tenants
 * - Les modifications du preset n'affectent pas les rôles déjà créés
 */
@Entity('role_presets')
export class RolePreset {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Identifiant technique unique du preset
   * Ex: call_center_standard, technical_support, flat_organization
   */
  @Column({ name: 'preset_id', type: 'varchar', length: 100, unique: true })
  presetId: string;

  /**
   * Nom d'affichage du preset
   * Ex: "Call Center Standard", "Support Technique"
   */
  @Column({ name: 'name', type: 'varchar', length: 200 })
  name: string;

  /**
   * Description du preset
   * Ex: "Hiérarchie standard pour un centre d'appels..."
   */
  @Column({ name: 'description', type: 'text', nullable: true })
  description: string;

  /**
   * Indique si le preset est actif
   * Un preset inactif n'apparaît pas dans les listes de sélection
   */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /**
   * Rôles qui composent ce preset
   * Relation OneToMany avec cascade delete
   */
  @OneToMany(() => RolePresetRole, (role) => role.preset, {
    cascade: true,
    eager: true,
  })
  roles: RolePresetRole[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
