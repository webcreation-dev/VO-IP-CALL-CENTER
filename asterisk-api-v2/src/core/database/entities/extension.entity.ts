import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Tenant } from './tenant.entity';

/**
 * Extension Entity
 *
 * Represents a dialplan extension in Asterisk (loaded via Realtime)
 * Extensions define call routing rules within a context
 *
 * Multi-tenant isolation:
 * - Each extension belongs to a tenant
 * - Context provides Asterisk-level isolation
 * - Unique constraint on (tenant_id, context, exten, priority)
 *
 * Asterisk Realtime:
 * - Asterisk loads these extensions dynamically from PostgreSQL
 * - Context must have "switch => Realtime" in extensions.conf
 *
 * @example
 * // Internal dial pattern
 * { context: 'company1', exten: '_1XXX', priority: 1, app: 'Dial', appdata: 'PJSIP/${EXTEN},20' }
 *
 * // Echo test
 * { context: 'company1', exten: '999', priority: 1, app: 'Answer', appdata: '' }
 * { context: 'company1', exten: '999', priority: 2, app: 'Echo', appdata: '' }
 */
@Entity('extensions')
@Unique(['tenantId', 'context', 'exten', 'priority'])
@Index(['tenantId'])
@Index(['context'])
@Index(['exten'])
export class Extension {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  /**
   * Tenant ID (foreign key)
   * Provides database-level multi-tenant isolation
   */
  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId: number;

  /**
   * Dialplan context
   * Provides Asterisk-level isolation (one context per tenant)
   * Max 40 characters (Asterisk limitation)
   */
  @Column({ length: 40 })
  context: string;

  /**
   * Extension pattern or number
   * Can be exact (e.g., "999") or pattern (e.g., "_1XXX", "_[2-9]XX")
   * Max 40 characters (Asterisk limitation)
   *
   * Pattern wildcards:
   * - X: any digit 0-9
   * - Z: any digit 1-9
   * - N: any digit 2-9
   * - [123]: matches 1, 2, or 3
   * - .: wildcard (matches anything)
   * - _: prefix indicating pattern match
   */
  @Column({ length: 40 })
  exten: string;

  /**
   * Priority/step number in the dialplan
   * Execution order (1, 2, 3, ...)
   * Must be sequential for each (context, exten) pair
   */
  @Column({ type: 'integer' })
  priority: number;

  /**
   * Asterisk application to execute
   * Examples: Dial, Answer, Hangup, Playback, Queue, VoiceMail, Echo, etc.
   * Max 40 characters
   */
  @Column({ length: 40 })
  app: string;

  /**
   * Application data/arguments
   * Format depends on the app
   * Examples:
   * - Dial: "PJSIP/${EXTEN},20"
   * - Playback: "hello-world"
   * - Queue: "support,t"
   * - VoiceMail: "${EXTEN}@default"
   * Max 256 characters
   */
  @Column({ length: 256 })
  appdata: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ========== Soft Delete Support ==========

  @Column({ name: 'deleted_at', type: 'timestamp with time zone', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'deleted_by', type: 'integer', nullable: true })
  deletedBy: number | null;

  @Column({ name: 'deletion_reason', type: 'text', nullable: true })
  deletionReason: string | null;

  // Relations
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
