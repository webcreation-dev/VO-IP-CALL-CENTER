import { Tenant } from 'src/core/database/entities/tenant.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sip_trunks')
export class SipTrunk {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 40 })
  name: string;

  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId: number;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  // SIP Configuration
  @Column({ name: 'remote_host', type: 'varchar', length: 255 })
  remoteHost: string;

  @Column({ type: 'varchar', length: 100 })
  username: string;

  @Column({ type: 'varchar', length: 100 })
  password: string;

  @Column({ type: 'varchar', length: 40, default: 'transport-udp' })
  transport: string;

  @Column({ type: 'varchar', length: 100, default: 'from-trunk' })
  context: string;

  // Registration Options
  @Column({ name: 'sends_registrations', type: 'boolean', default: true })
  sendsRegistrations: boolean;

  @Column({ name: 'sends_auth', type: 'boolean', default: true })
  sendsAuth: boolean;

  @Column({ name: 'client_uri', type: 'varchar', length: 255, nullable: true })
  clientUri: string | null;

  @Column({ name: 'server_uri', type: 'varchar', length: 255, nullable: true })
  serverUri: string | null;

  @Column({ name: 'retry_interval', type: 'integer', default: 60 })
  retryInterval: number;

  @Column({ type: 'integer', default: 3600 })
  expiration: number;

  @Column({ name: 'max_retries', type: 'integer', default: 10 })
  maxRetries: number;

  @Column({ name: 'forbidden_retry_interval', type: 'integer', default: 0 })
  forbiddenRetryInterval: number;

  @Column({ type: 'boolean', default: false })
  line: boolean;

  @Column({ name: 'outbound_proxy', type: 'varchar', length: 255, nullable: true })
  outboundProxy: string | null;

  @Column({ name: 'support_path', type: 'boolean', default: false })
  supportPath: boolean;

  // Metadata
  @Column({ name: 'display_name', type: 'varchar', length: 100, nullable: true })
  displayName: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
