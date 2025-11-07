import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { EndpointRole } from './entities/endpoint-role.entity';
import { CallAuditLog } from './entities/call-audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EndpointRole, CallAuditLog])],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService, TypeOrmModule],
})
export class RolesModule {}
