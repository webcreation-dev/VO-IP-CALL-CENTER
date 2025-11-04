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
 * PsEndpoint Entity
 *
 * Represents a PJSIP endpoint in Asterisk
 *
 * Table: ps_endpoints
 * Primary Key: id (prefixed name, e.g., "t1_101")
 *
 * Multi-Tenant Strategy:
 * - id: Contains tenant prefix (e.g., "t1_101")
 * - display_name: User-friendly name without prefix (e.g., "101")
 * - tenant_id: Foreign key to tenants table
 *
 * Relationships:
 * - Many-to-One with Tenant
 * - Has corresponding PsAuth and PsAor with same id
 *
 * Notes:
 * - Column names use snake_case in DB, camelCase in code
 * - Not all Asterisk ps_endpoints columns are included (only commonly used ones)
 * - For full PJSIP options, see Asterisk documentation
 */
@Entity('ps_endpoints')
export class PsEndpoint {
  // Primary key - prefixed endpoint ID (e.g., "t1_101")
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

  // Transport to use for the endpoint
  @Column({ length: 40, nullable: true })
  transport: string;

  // Comma-separated list of AoRs to associate with this endpoint
  @Column({ length: 200, nullable: true })
  aors: string;

  // Comma-separated list of auth sections to associate with this endpoint
  @Column({ length: 200, nullable: true })
  auth: string;

  // Dialplan context for inbound calls
  @Column({ length: 40, nullable: true, default: 'default' })
  context: string;

  // Codecs to disallow (comma-separated)
  @Column({ length: 200, nullable: true, default: 'all' })
  disallow: string;

  // Codecs to allow (comma-separated)
  @Column({ length: 200, nullable: true, default: 'ulaw,alaw' })
  allow: string;

  // Enable Direct Media (direct RTP between endpoints)
  @Column({ name: 'direct_media', length: 3, nullable: true, default: 'yes' })
  directMedia: string;

  // Trust endpoint-supplied connected line information
  @Column({ name: 'trust_id_inbound', length: 3, nullable: true, default: 'no' })
  trustIdInbound: string;

  // Send connected line information to endpoint
  @Column({ name: 'send_pai', length: 3, nullable: true, default: 'no' })
  sendPai: string;

  // Send RPID/PAI headers
  @Column({ name: 'send_rpid', length: 3, nullable: true, default: 'no' })
  sendRpid: string;

  // CallerID name to set for calls from this endpoint
  @Column({ name: 'callerid', length: 40, nullable: true })
  callerid: string;

  // Enable/disable DTMF RFC4733
  @Column({ name: 'dtmf_mode', length: 20, nullable: true, default: 'rfc4733' })
  dtmfMode: string;

  // Enable/disable ICE support
  @Column({ name: 'ice_support', length: 3, nullable: true, default: 'no' })
  iceSupport: string;

  // Enable/disable MWI (Message Waiting Indicator)
  @Column({ name: 'mailboxes', length: 100, nullable: true })
  mailboxes: string;

  // Endpoint device state (computed by Asterisk, not stored)
  // This will be enriched from AMI real-time data

  // Timestamps (added by migration, not part of original Asterisk table)
  @CreateDateColumn({ name: 'created_at', nullable: true })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt: Date;

  // Virtual properties
  get interface(): string {
    return `PJSIP/${this.id}`;
  }
}
