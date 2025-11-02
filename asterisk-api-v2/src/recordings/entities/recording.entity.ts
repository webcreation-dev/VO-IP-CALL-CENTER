import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('call_recordings')
@Index(['tenantId', 'createdAt'])
@Index(['tenantId', 'uniqueid'])
export class Recording {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'tenant_id', type: 'integer', nullable: true })
  tenantId: number;

  @Column({ name: 'uniqueid', length: 150 })
  uniqueid: string;

  @Column({ length: 255 })
  filename: string;

  @Column({ name: 'filepath', length: 500 })
  filepath: string;

  @Column({ length: 10, nullable: true })
  format: string;

  @Column({ type: 'integer', nullable: true })
  duration: number;

  @Column({ name: 'filesize', type: 'bigint', nullable: true })
  filesize: number;

  @Column({ length: 80, nullable: true })
  src: string;

  @Column({ length: 80, nullable: true })
  dst: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ name: 'deleted_at', type: 'timestamp with time zone', nullable: true })
  deletedAt: Date;
}
