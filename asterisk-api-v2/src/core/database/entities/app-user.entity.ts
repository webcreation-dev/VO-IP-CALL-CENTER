import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { UserRole } from '../../../common/enums/user-role.enum';

@Entity('app_users')
export class AppUser {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: number | null;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password', select: false }) // Ne pas retourner le password dans les queries par défaut
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.AGENT,
  })
  role: UserRole;

  @Column({ name: 'first_name', length: 100, nullable: true })
  firstName: string;

  @Column({ name: 'last_name', length: 100, nullable: true })
  lastName: string;

  // NOTE: Ces colonnes n'existent pas dans la DB actuelle - commentées
  // @Column({ length: 20, nullable: true })
  // phone: string;
  //
  // // Reference to SIP endpoint (for agents)
  // @Column({ name: 'endpoint_id', length: 40, nullable: true })
  // endpointId: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLogin: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Virtual property for full name
  get fullName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    return this.firstName || this.lastName || this.email;
  }

  // Check if user is super admin
  get isSuperAdmin(): boolean {
    return this.role === UserRole.SUPER_ADMIN;
  }

  // Check if user can access a specific tenant
  canAccessTenant(tenantId: number): boolean {
    if (this.isSuperAdmin) return true;
    return this.tenantId === tenantId;
  }
}
