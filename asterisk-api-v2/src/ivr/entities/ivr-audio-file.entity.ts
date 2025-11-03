import { Tenant } from "src/core/database/entities/tenant.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

// ivr-audio-file.entity.ts
@Entity('ivr_audio_files')
export class IvrAudioFile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  tenant_id: number;

  @Column()
  name: string;

  @Column()
  filename: string;

  @Column()
  filepath: string;

  @Column()
  format: string;

  @Column({ type: 'float' })
  duration: number;

  @Column({ nullable: true })
  language: string;

  @Column({ type: 'bigint' })
  filesize: number;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}