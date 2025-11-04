import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import type { DialplanConfig } from '../../../common/interfaces/dialplan-config.interface';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ name: 'company_name', nullable: true })
  companyName: string;

  @Column({ name: 'contact_email', nullable: true })
  contactEmail: string;

  @Column({ name: 'contact_phone', length: 50, nullable: true })
  contactPhone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ length: 100, nullable: true })
  country: string;

  @Column({ length: 50, default: 'UTC' })
  timezone: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'max_endpoints', type: 'integer', default: 100 })
  maxEndpoints: number;

  @Column({ name: 'max_queues', type: 'integer', default: 50 })
  maxQueues: number;

  /**
   * Asterisk dialplan context for this tenant
   * Provides isolation at the Asterisk level
   * Auto-generated from tenant name if not provided
   */
  @Column({ length: 50, nullable: true })
  context: string;

  @Column({ name: 'dialplan_config', type: 'jsonb', nullable: true })
  dialplanConfig: DialplanConfig;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations will be added as we create other entities
  // @OneToMany(() => AppUser, (user) => user.tenant)
  // users: AppUser[];

  // @OneToMany(() => PsEndpoint, (endpoint) => endpoint.tenant)
  // endpoints: PsEndpoint[];

  // @OneToMany(() => Queue, (queue) => queue.tenant)
  // queues: Queue[];
}