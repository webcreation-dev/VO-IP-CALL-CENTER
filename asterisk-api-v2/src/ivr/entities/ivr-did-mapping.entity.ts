
import { Tenant } from "../../core/database/entities/tenant.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { IvrMenu } from "./ivr-menu.entity";
@Entity('ivr_did_mappings')
@Unique(['tenant_id', 'did'])
export class IvrDidMapping {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  tenant_id: number;

  @Column()
  did: string;

  @Column({ type: 'integer' })
  menu_id: number;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  // Relations
  @ManyToOne(() => IvrMenu)
  @JoinColumn({ name: 'menu_id' })
  menu: IvrMenu;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
