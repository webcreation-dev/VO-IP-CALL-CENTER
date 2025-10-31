import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';

import { MonitoringService } from './monitoring.service';
import { WsJwtGuard } from '../common/guards/ws-jwt.guard';

@WebSocketGateway({
  namespace: '/monitoring',
  cors: {
    origin: '*', // Configure appropriately in production
    credentials: true,
  },
})
export class MonitoringGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MonitoringGateway.name);
  private updateInterval: NodeJS.Timeout;

  constructor(private readonly monitoringService: MonitoringService) {}

  afterInit() {
    this.logger.log('Monitoring WebSocket Gateway initialized');

    // Start periodic updates every 5 seconds
    this.updateInterval = setInterval(() => {
      this.broadcastDashboardUpdate();
    }, 5000);
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    // Send initial dashboard data
    const tenantId = this.extractTenantId(client);
    if (tenantId) {
      this.sendDashboardData(client, tenantId);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe_dashboard')
  async handleSubscribeDashboard(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: number },
  ) {
    const tenantId = data.tenantId;

    // Join tenant-specific room
    client.join(`tenant_${tenantId}`);
    this.logger.log(`Client ${client.id} subscribed to tenant ${tenantId}`);

    // Send immediate update
    await this.sendDashboardData(client, tenantId);
  }

  @SubscribeMessage('unsubscribe_dashboard')
  handleUnsubscribeDashboard(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: number },
  ) {
    const tenantId = data.tenantId;
    client.leave(`tenant_${tenantId}`);
    this.logger.log(`Client ${client.id} unsubscribed from tenant ${tenantId}`);
  }

  /**
   * Broadcast dashboard updates to all connected clients
   */
  private async broadcastDashboardUpdate() {
    try {
      // Get all active rooms (tenant rooms)
      const rooms = Array.from(this.server.sockets.adapter.rooms.keys())
        .filter((room: string) => room.startsWith('tenant_'));

      for (const room of rooms) {
        const tenantId = parseInt((room as string).replace('tenant_', ''), 10);

        if (!isNaN(tenantId)) {
          const dashboardData = await this.monitoringService.getDashboard(tenantId);

          this.server.to(room).emit('dashboard_update', dashboardData);
        }
      }
    } catch (error: any) {
      this.logger.error(`Failed to broadcast dashboard update: ${error.message}`);
    }
  }

  /**
   * Send dashboard data to a specific client
   */
  private async sendDashboardData(client: Socket, tenantId: number) {
    try {
      const dashboardData = await this.monitoringService.getDashboard(tenantId);
      client.emit('dashboard_update', dashboardData);
    } catch (error: any) {
      this.logger.error(`Failed to send dashboard data: ${error.message}`);
      client.emit('error', { message: 'Failed to fetch dashboard data' });
    }
  }

  /**
   * Extract tenant ID from socket connection
   */
  private extractTenantId(client: Socket): number | null {
    // Extract from handshake query or auth token
    const tenantId = client.handshake.query.tenantId as string;
    return tenantId ? parseInt(tenantId, 10) : null;
  }

  /**
   * Emit AMI event to subscribers
   */
  emitAmiEvent(event: any) {
    this.server.emit('ami_event', event);
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}
