import { Tenant } from '../../core/database/entities/tenant.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SoundFileCategory {
  MOH = 'moh',
  ANNOUNCEMENT = 'announcement',
  GREETING = 'greeting',
  PROMPT = 'prompt',
  OTHER = 'other',
}

@Entity('sound_files')
export class SoundFile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId: number;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  filename: string;

  @Column({ type: 'varchar', length: 500 })
  filepath: string;

  @Column({ type: 'varchar', length: 20 })
  format: string;

  @Column({ type: 'float', nullable: true })
  duration: number | null;

  @Column({ type: 'bigint' })
  filesize: number;

  @Column({
    type: 'enum',
    enum: SoundFileCategory,
    default: SoundFileCategory.OTHER,
  })
  category: SoundFileCategory;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
