import { Tenant } from '../../core/database/entities/tenant.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

export enum MohMode {
  FILES = 'files',
  QUIETMP3 = 'quietmp3',
  CUSTOM = 'custom',
}

export enum MohSort {
  ALPHA = 'alpha',
  RANDOM = 'random',
}

@Entity('moh_classes')
@Unique(['tenantId', 'name'])
export class MohClass {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId: number;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: MohMode,
    default: MohMode.FILES,
  })
  mode: MohMode;

  @Column({ type: 'varchar', length: 500, nullable: true })
  directory: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  application: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, default: 'wav' })
  format: string | null;

  @Column({
    type: 'enum',
    enum: MohSort,
    default: MohSort.RANDOM,
  })
  sort: MohSort;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
