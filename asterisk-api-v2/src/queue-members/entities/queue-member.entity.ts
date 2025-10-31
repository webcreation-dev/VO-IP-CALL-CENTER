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
 * QueueMember Entity
 * Composite PK: (tenant_id, queue_name, interface)
 */
@Entity('queue_members')
export class QueueMember {
  @PrimaryColumn({ name: 'tenant_id' })
  tenantId: number;

  @PrimaryColumn({ name: 'queue_name', length: 128 })
  queueName: string;

  @PrimaryColumn({ length: 128 })
  interface: string;

  @Column({ length: 80, nullable: true })
  membername: string;

  @Column({ type: 'integer', default: 0 })
  penalty: number;

  @Column({ type: 'integer', default: 0 })
  paused: number;

  @Column({ name: 'wrapuptime', type: 'integer', nullable: true, default: 0 })
  wrapuptime: number;

  @Column({ name: 'state_interface', length: 80, nullable: true })
  stateInterface: string;

  @Column({ type: 'integer', nullable: false })
  uniqueid: number;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
