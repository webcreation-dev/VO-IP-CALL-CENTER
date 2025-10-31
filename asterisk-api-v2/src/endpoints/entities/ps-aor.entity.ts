import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Tenant } from '../../core/database/entities/tenant.entity';

/**
 * PsAor Entity
 *
 * Represents PJSIP Address of Record (AoR) configuration in Asterisk
 *
 * An AoR is a logical endpoint that can have multiple contacts (registrations)
 *
 * Table: ps_aors
 * Primary Key: id (prefixed name, must match endpoint id)
 *
 * Multi-Tenant Strategy:
 * - id: Contains tenant prefix (e.g., "t1_101")
 * - display_name: User-friendly name without prefix (e.g., "101")
 * - tenant_id: Foreign key to tenants table
 *
 * Relationships:
 * - Many-to-One with Tenant
 * - Corresponds to PsEndpoint with same id
 *
 * Notes:
 * - Column names use snake_case in DB, camelCase in code
 * - For full PJSIP AoR options, see Asterisk documentation
 */
@Entity('ps_aors')
export class PsAor {
  // Primary key - prefixed AoR ID (must match endpoint id)
  @PrimaryColumn({ length: 40 })
  id: string;

  // Display name (user-friendly, without prefix)
  @Column({ name: 'display_name', length: 40, nullable: true })
  displayName: string;

  // Tenant relationship
  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: number;

  // Maximum number of contacts (simultaneous registrations)
  @Column({ name: 'max_contacts', type: 'integer', nullable: true, default: 1 })
  maxContacts: number;

  // Remove existing contacts on registration
  @Column({ name: 'remove_existing', length: 3, nullable: true, default: 'no' })
  removeExisting: string;

  // Minimum registration expiration time (seconds)
  @Column({ name: 'minimum_expiration', type: 'integer', nullable: true, default: 60 })
  minimumExpiration: number;

  // Maximum registration expiration time (seconds)
  @Column({ name: 'maximum_expiration', type: 'integer', nullable: true, default: 3600 })
  maximumExpiration: number;

  // Default registration expiration time (seconds)
  @Column({ name: 'default_expiration', type: 'integer', nullable: true, default: 3600 })
  defaultExpiration: number;

  // How often to qualify the AoR (0 = disabled, seconds)
  @Column({ name: 'qualify_frequency', type: 'integer', nullable: true, default: 0 })
  qualifyFrequency: number;

  // Timeout for qualify OPTIONS request (seconds)
  @Column({ name: 'qualify_timeout', type: 'real', nullable: true, default: 3.0 })
  qualifyTimeout: number;

  // Authenticate QUALIFY requests
  @Column({ name: 'authenticate_qualify', length: 3, nullable: true, default: 'no' })
  authenticateQualify: string;

  // Support path headers for outbound calls
  @Column({ name: 'support_path', length: 3, nullable: true, default: 'no' })
  supportPath: string;

  // Mailboxes to check for MWI
  @Column({ length: 200, nullable: true })
  mailboxes: string;

  // Timestamps (added by migration, not part of original Asterisk table)
  @CreateDateColumn({ name: 'created_at', nullable: true })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt: Date;
}
