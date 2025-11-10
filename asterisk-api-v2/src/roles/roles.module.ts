import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { EndpointRole } from './entities/endpoint-role.entity';
import { CallAuditLog } from './entities/call-audit-log.entity';
import { RolePreset } from './entities/role-preset.entity';
import { RolePresetRole } from './entities/role-preset-role.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EndpointRole,
      CallAuditLog,
      RolePreset,
      RolePresetRole,
    ]),
  ],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService, TypeOrmModule],
})
export class RolesModule {}
