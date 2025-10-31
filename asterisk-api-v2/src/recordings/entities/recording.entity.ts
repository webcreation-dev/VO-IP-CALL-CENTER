import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('recordings')
@Index(['tenantId', 'createdAt'])
@Index(['tenantId', 'callId'])
export class Recording {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId: number;

  @Column({ name: 'call_id', length: 32 })
  callId: string;

  @Column({ length: 255 })
  filename: string;

  @Column({ name: 'file_path', length: 500 })
  filePath: string;

  @Column({ length: 10, default: 'wav' })
  format: string;

  @Column({ type: 'integer', default: 0 })
  duration: number;

  @Column({ name: 'file_size', type: 'bigint', default: 0 })
  fileSize: number;

  @Column({ length: 80, nullable: true })
  src: string;

  @Column({ length: 80, nullable: true })
  dst: string;

  @Column({ name: 'recorded_by', length: 100, nullable: true })
  recordedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean;
}
