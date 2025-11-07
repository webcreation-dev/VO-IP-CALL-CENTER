import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../core/database/entities/tenant.entity';
import { EndpointRole } from './endpoint-role.entity';

/**
 * CallAuditLog Entity
 *
 * Journal d'audit des tentatives d'appels (autorisés et refusés).
 * Permet de tracer toutes les décisions de permissions pour debugging et audit.
 */
@Entity('call_audit_logs')
@Index(['tenantId'])
@Index(['callerEndpointId'])
@Index(['calledEndpointId'])
@Index(['action'])
@Index(['createdAt'])
@Index(['tenantId', 'createdAt'])
@Index(['tenantId', 'action', 'createdAt'])
export class CallAuditLog {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  // ========================================
  // Tenant Association
  // ========================================

  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId: number;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  // ========================================
  // Caller Information
  // ========================================

  @Column({ name: 'caller_endpoint_id', length: 40, nullable: true })
  callerEndpointId: string;

  @Column({ name: 'caller_role_id', type: 'integer', nullable: true })
  callerRoleId: number;

  @ManyToOne(() => EndpointRole, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'caller_role_id' })
  callerRole: EndpointRole;

  // ========================================
  // Called Information
  // ========================================

  @Column({ name: 'called_endpoint_id', length: 40, nullable: true })
  calledEndpointId: string;

  @Column({ name: 'called_role_id', type: 'integer', nullable: true })
  calledRoleId: number;

  @ManyToOne(() => EndpointRole, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'called_role_id' })
  calledRole: EndpointRole;

  // ========================================
  // Context Information
  // ========================================

  @Column({ name: 'caller_context', length: 128, nullable: true })
  callerContext: string;

  @Column({ name: 'called_context', length: 128, nullable: true })
  calledContext: string;

  // ========================================
  // Validation Result
  // ========================================

  @Column({ length: 20 })
  action: 'allowed' | 'denied';

  @Column({ name: 'deny_reason', length: 100, nullable: true })
  denyReason: string;

  // ========================================
  // Asterisk Metadata
  // ========================================

  @Column({ name: 'channel_id', length: 100, nullable: true })
  channelId: string;

  @Column({ length: 100, nullable: true })
  uniqueid: string;

  @Column({ name: 'caller_number', length: 40, nullable: true })
  callerNumber: string;

  @Column({ name: 'called_number', length: 40, nullable: true })
  calledNumber: string;

  // ========================================
  // Additional Data
  // ========================================

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // ========================================
  // Timestamp
  // ========================================

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
