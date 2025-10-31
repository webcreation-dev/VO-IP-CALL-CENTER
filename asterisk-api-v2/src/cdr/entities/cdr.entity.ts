import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('cdr')
@Index(['tenantId', 'calldate'])
@Index(['tenantId', 'src'])
@Index(['tenantId', 'dst'])
@Index(['tenantId', 'disposition'])
export class Cdr {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'integer', nullable: true })
  tenantId: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  calldate: Date;

  @Column({ length: 80, default: '' })
  clid: string;

  @Column({ length: 80, default: '' })
  src: string;

  @Column({ length: 80, default: '' })
  dst: string;

  @Column({ length: 80, default: '' })
  dcontext: string;

  @Column({ length: 80, default: '' })
  channel: string;

  @Column({ length: 80, default: '' })
  dstchannel: string;

  @Column({ length: 80, default: '' })
  lastapp: string;

  @Column({ length: 80, default: '' })
  lastdata: string;

  @Column({ type: 'integer', default: 0 })
  duration: number;

  @Column({ type: 'integer', default: 0 })
  billsec: number;

  @Column({ length: 45, default: '' })
  disposition: string;

  @Column({ type: 'integer', default: 0 })
  amaflags: number;

  @Column({ length: 50, default: '' })
  accountcode: string;

  @Column({ length: 32, default: '' })
  uniqueid: string;

  @Column({ length: 150, default: '' })
  userfield: string;

  @Column({ length: 32, nullable: true })
  peeraccount: string;

  @Column({ length: 32, nullable: true })
  linkedid: string;

  @Column({ type: 'integer', nullable: true })
  sequence: number;
}
