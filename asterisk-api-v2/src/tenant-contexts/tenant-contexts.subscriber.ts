import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  RemoveEvent,
  UpdateEvent,
} from 'typeorm';
import { TenantContext } from '../core/database/entities/tenant-context.entity';
import { Injectable } from '@nestjs/common';
import { TenantContextsService } from './tenant-contexts.service';

@Injectable()
@EventSubscriber()
export class TenantContextSubscriber implements EntitySubscriberInterface<TenantContext> {
  constructor(
    private readonly tenantContextsService: TenantContextsService,
    dataSource: DataSource,
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return TenantContext;
  }

  async afterInsert(event: InsertEvent<TenantContext>) {
    console.log(
      `::::::::::::::::::::::::::::::::Tenant context inserted and will be regenerated: ${event.entity?.name}`,
    );
    await this.tenantContextsService.scheduleContextRegeneration();
  }

  async afterUpdate(event: UpdateEvent<TenantContext>) {
    console.log(
      `::::::::::::::::::::::::::::::::Tenant context updated and will be regenerated: ${event.entity?.name}`,
    );
    await this.tenantContextsService.scheduleContextRegeneration();
  }

  async afterRemove(event: RemoveEvent<TenantContext>) {
    console.log(
      `::::::::::::::::::::::::::::::::Tenant context removed and will be regenerated: ${event.entity?.name}`,
    );
    await this.tenantContextsService.scheduleContextRegeneration();
  }
}