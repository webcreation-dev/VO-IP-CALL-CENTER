import { Tenant } from "../../core/database/entities/tenant.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { IvrMenu } from "./ivr-menu.entity";
import type { ActionConfig } from "../interfaces/action-config.interface";

@Entity('ivr_conditions')
export class IvrCondition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  menu_id: number;

  @Column({ type: 'integer' })
  tenant_id: number;

  @Column({
    type: 'enum',
    enum: ['time', 'caller_id', 'did', 'custom'],
  })
  condition_type: string;

  @Column({ type: 'jsonb' })
  condition_config: Record<string, any>;

  @Column({ type: 'jsonb' })
  action: ActionConfig;

  @Column({ default: 0 })
  priority: number;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  // Relations
  @ManyToOne(() => IvrMenu, menu => menu.conditions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_id' })
  menu: IvrMenu;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
