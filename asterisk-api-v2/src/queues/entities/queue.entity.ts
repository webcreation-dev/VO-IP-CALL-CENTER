import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Tenant } from '../../core/database/entities/tenant.entity';

/**
 * Queue Entity - Asterisk queues table
 * Based on actual PostgreSQL schema
 */
@Entity('queues')
export class Queue {
  // Primary key - queue name (prefixed with tenant)
  @PrimaryColumn({ length: 128 })
  name: string;

  // Tenant ID (foreign key)
  @Column({ name: 'tenant_id', nullable: false })
  tenantId: number;

  // Tenant relationship
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  // Queue strategy
  @Column({ type: 'varchar', length: 128, nullable: true })
  strategy: string;

  // Timeout for ringing
  @Column({ type: 'integer', nullable: true })
  timeout: number;

  // Retry delay
  @Column({ type: 'integer', nullable: true })
  retry: number;

  // Maximum queue length
  @Column({ type: 'integer', nullable: true })
  maxlen: number;

  // Weight
  @Column({ type: 'integer', nullable: true })
  weight: number;

  // Announce position
  @Column({ name: 'announce_position', length: 128, nullable: true })
  announcePosition: string;

  // Announce hold time
  @Column({ name: 'announce_holdtime', length: 128, nullable: true })
  announceHoldtime: string;

  // Music on hold
  @Column({ name: 'musiconhold', length: 128, nullable: true })
  musiconhold: string;

  // Announce frequency
  @Column({ name: 'announce_frequency', type: 'integer', nullable: true })
  announceFrequency: number;

  // Min announce frequency
  @Column({ name: 'min_announce_frequency', type: 'integer', nullable: true })
  minAnnounceFrequency: number;

  // Service level
  @Column({ name: 'servicelevel', type: 'integer', nullable: true })
  servicelevel: number;

  // Join empty
  @Column({ name: 'joinempty', length: 128, nullable: true })
  joinempty: string;

  // Leave when empty
  @Column({ name: 'leavewhenempty', length: 128, nullable: true })
  leavewhenempty: string;

  // Ring in use
  @Column({ name: 'ringinuse', type: 'varchar', nullable: true })
  ringinuse: string;

  // Member delay
  @Column({ name: 'memberdelay', type: 'integer', nullable: true })
  memberdelay: number;

  // Wrap-up time
  @Column({ name: 'wrapuptime', type: 'integer', nullable: true })
  wrapuptime: number;

  // Autopause
  @Column({ name: 'autopause', type: 'varchar', nullable: true })
  autopause: string;

  // Periodic announce
  @Column({ name: 'periodic_announce', length: 50, nullable: true })
  periodicAnnounce: string;

  // Periodic announce frequency
  @Column({ name: 'periodic_announce_frequency', type: 'integer', nullable: true })
  periodicAnnounceFrequency: number;

  // Context
  @Column({ length: 128, nullable: true })
  context: string;

  // Announce
  @Column({ length: 128, nullable: true })
  announce: string;
}
