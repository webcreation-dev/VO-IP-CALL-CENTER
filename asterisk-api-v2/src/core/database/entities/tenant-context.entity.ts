import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from './tenant.entity';

/**
 * TenantContext Entity
 *
 * Represents a dialplan context within a tenant
 * Each tenant can have multiple contexts for organizational separation
 *
 * Table: tenant_contexts
 *
 * Multi-Tenant Strategy:
 * - Each tenant has ONE primary context (created automatically)
 * - Additional contexts can be added for departments, teams, etc.
 * - Dialplan rules (extensions) are associated with specific contexts
 * - Provides isolation: users in context A cannot call users in context B (unless explicitly allowed)
 *
 * Example:
 * Tenant "Company A" (id=1):
 *   - t1_default (primary) - General company context
 *   - t1_sales - Sales department
 *   - t1_support - Support team
 *   - t1_management - Management only
 *
 * Relationships:
 * - Many-to-One with Tenant
 */
@Entity('tenant_contexts')
@Index(['tenantId', 'isPrimary'], { unique: true, where: 'is_primary = true' })
export class TenantContext {
  @PrimaryGeneratedColumn()
  id: number;

  // Tenant owner
  @ManyToOne(() => Tenant, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: number;

  // Context name (unique across all tenants)
  // Format: t{tenantId}_{contextName}
  // Example: t1_default, t1_sales, t2_support
  @Column({ length: 100, unique: true })
  @Index()
  name: string;

  // Human-readable description
  @Column({ type: 'text', nullable: true })
  description: string;

  // Whether this is the primary context for the tenant
  // Only ONE primary context per tenant (enforced by unique index)
  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;

  // Dynamic dialplan configuration (JSON)
  // Can contain rules like:
  // - allowInbound: boolean
  // - allowOutbound: boolean
  // - allowInternal: boolean
  // - allowInterContext: boolean
  // - timeBasedRouting: object
  // - customRules: array
  @Column({ name: 'dialplan_config', type: 'jsonb', nullable: true })
  dialplanConfig: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
