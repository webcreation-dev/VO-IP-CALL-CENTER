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
 * PsAuth Entity
 *
 * Represents PJSIP authentication configuration in Asterisk
 *
 * Table: ps_auths
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
 * - Password is stored in plain text by Asterisk (security consideration)
 * - For full PJSIP auth options, see Asterisk documentation
 */
@Entity('ps_auths')
export class PsAuth {
  // Primary key - prefixed auth ID (must match endpoint id)
  @PrimaryColumn({ length: 40 })
  id: string;

  // COMMENTED - COLUMN DOESN'T EXIST IN DB - UNCOMMENT FOR PRODUCTION
  // // Display name (user-friendly, without prefix)
  // @Column({ name: 'display_name', length: 40, nullable: true })
  // displayName: string;

  // Tenant relationship
  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: number;

  // Authentication type (userpass, md5, google_oauth, etc.)
  @Column({ name: 'auth_type', length: 20, nullable: true, default: 'userpass' })
  authType: string;

  // Username for authentication
  @Column({ length: 40, nullable: true })
  username: string;

  // Password for authentication (plain text in Asterisk DB)
  @Column({ length: 80, nullable: true })
  password: string;

  // MD5 credential (alternative to password)
  @Column({ name: 'md5_cred', length: 40, nullable: true })
  md5Cred: string;

  // Authentication realm
  @Column({ length: 40, nullable: true })
  realm: string;

  // Nonce lifetime (seconds)
  @Column({ name: 'nonce_lifetime', type: 'integer', nullable: true, default: 32 })
  nonceLifetime: number;

  // COMMENTED - COLUMNS DON'T EXIST IN DB - UNCOMMENT FOR PRODUCTION
  // // Timestamps (added by migration, not part of original Asterisk table)
  // @CreateDateColumn({ name: 'created_at', nullable: true })
  // createdAt: Date;
  //
  // @UpdateDateColumn({ name: 'updated_at', nullable: true })
  // updatedAt: Date;
}
