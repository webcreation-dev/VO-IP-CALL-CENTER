import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Check,
} from 'typeorm';
import { Tenant } from '../../core/database/entities/tenant.entity';
import { TenantContext } from '../../core/database/entities/tenant-context.entity';

/**
 * EndpointRole Entity
 *
 * Définit les rôles hiérarchiques pour les endpoints avec leurs permissions d'appel.
 *
 * Deux types de rôles sont supportés :
 * - Rôles tenant-wide (contextId = null) : Partagés entre tous les contextes du tenant
 * - Rôles context-specific (contextId défini) : Spécifiques à un contexte particulier
 *
 * Les contraintes d'unicité sont gérées par des index uniques en DB qui supportent
 * les deux modes via COALESCE(context_id, -1).
 */
@Entity('endpoint_roles')
@Check('"level" >= 1 AND "level" <= 10')
export class EndpointRole {
  @PrimaryGeneratedColumn()
  id: number;

  // ========================================
  // Tenant Association
  // ========================================

  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId: number;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  // ========================================
  // Context Association (Optional)
  // ========================================

  /**
   * ID du contexte (optionnel)
   * - NULL : Rôle tenant-wide (partagé entre tous les contextes)
   * - Non-NULL : Rôle context-specific (uniquement pour ce contexte)
   */
  @Column({ name: 'context_id', type: 'integer', nullable: true })
  contextId: number | null;

  @ManyToOne(() => TenantContext, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'context_id' })
  context: TenantContext | null;

  // ========================================
  // Role Information
  // ========================================

  @Column({ length: 50 })
  name: string;

  @Column({ name: 'display_name', length: 100 })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // ========================================
  // Hierarchy
  // ========================================

  /**
   * Niveau hiérarchique du rôle (1-10)
   * 1 = niveau le plus bas (Agent)
   * 10 = niveau le plus haut (Directeur)
   */
  @Column({ type: 'integer', default: 1 })
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

  // ========================================
  // Metadata
  // ========================================

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
