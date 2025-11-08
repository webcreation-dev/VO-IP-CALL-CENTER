import { Tenant } from "../../core/database/entities/tenant.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { IvrOption } from "./ivr-option.entity";
import { IvrCondition } from "./ivr-condition.entity";
import type { ActionConfig } from "../interfaces/action-config.interface"; 
@Entity('ivr_menus')
export class IvrMenu {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  tenant_id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  welcome_sound: string;

  @Column({ nullable: true })
  invalid_sound: string;

  @Column({ nullable: true })
  timeout_sound: string;

  @Column({ default: 5 })
  timeout: number;

  @Column({ default: 3 })
  max_retries: number;

  @Column({ default: 1 })
  max_digits: number;

  @Column({ type: 'jsonb' })
  timeout_action: ActionConfig;

  @Column({ type: 'jsonb' })
  invalid_action: ActionConfig;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @OneToMany(() => IvrOption, option => option.menu)
  options: IvrOption[];

  @OneToMany(() => IvrCondition, condition => condition.menu)
  conditions: IvrCondition[];

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
