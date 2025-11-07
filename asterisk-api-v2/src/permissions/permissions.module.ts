import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallValidatorAriGateway } from './gateways/call-validator-ari.gateway';
import { CallPermissionValidatorService } from './services/call-permission-validator.service';
import { PsEndpoint } from '../endpoints/entities/ps-endpoint.entity';
import { TenantContext } from '../core/database/entities/tenant-context.entity';
import { CallAuditLog } from '../roles/entities/call-audit-log.entity';
import { AriModule } from '../core/asterisk/ari/ari.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PsEndpoint, TenantContext, CallAuditLog]),
    AriModule,
  ],
  providers: [CallValidatorAriGateway, CallPermissionValidatorService],
  exports: [CallPermissionValidatorService],
})
export class PermissionsModule {}
