import { io, Socket } from 'socket.io-client';
import { WS_URL } from './config';

// Dashboard data interface
export interface DashboardUpdate {
  timestamp: string;
  tenantId: number;
  stats: {
    totalCalls: number;
    activeCalls: number;
    waitingCalls: number;
    completedCalls: number;
    abandonedCalls: number;
    avgWaitTime: number;
    longestWaitTime: number;
  };
  queues: Array<{
    name: string;
    waitingCalls: number;
    availableAgents: number;
    busyAgents: number;
    pausedAgents: number;
    avgWaitTime: number;
    serviceLevelPerf: number;
  }>;
  agents: Array<{
    id: string;
    name: string;
    state: string;
    stateTime: number;
    callsTaken: number;
    lastCall: number;
  }>;
  activeChannels: Array<{
    id: string;
    channel: string;
    state: string;
    callerNum: string;
    callerName: string;
    connectedNum: string;
    duration: number;
  }>;
}

// AMI Event interface
export interface AMIEvent {
  Event: string;
  Timestamp: string;
  [key: string]: any;
}

class WebSocketManager {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private isConnecting = false;

  // Connect to WebSocket server
  connect(tenantId?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        console.log('WebSocket already connected');
        resolve();
        return;
      }

      if (this.isConnecting) {
        console.log('WebSocket connection already in progress');
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;
      const token = localStorage.getItem('access_token');

      if (!token) {
        this.isConnecting = false;
        reject(new Error('No authentication token found'));
        return;
      }

      console.log('Connecting to WebSocket...', WS_URL);

      this.socket = io(`${WS_URL}/monitoring`, {
        auth: {
          token
        },
        query: tenantId ? { tenantId: tenantId.toString() } : {},
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 10000,
      });

      // Connection events
      this.socket.on('connect', () => {
        console.log('WebSocket connected successfully');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.emit('connected', { connected: true });
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error.message);
        this.isConnecting = false;
        this.reconnectAttempts++;

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.emit('error', {
            message: 'Failed to connect to monitoring service',
            error
          });
          this.disconnect();
          reject(error);
        } else {
          // Exponential backoff
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, 10000);
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        this.isConnecting = false;
        this.emit('disconnected', { reason });

        if (reason === 'io server disconnect') {
          // Server initiated disconnect, try to reconnect
          setTimeout(() => this.reconnect(), this.reconnectDelay);
        }
      });

      // Error event
      this.socket.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', { message: error.message || 'WebSocket error', error });
      });

      // Dashboard updates
      this.socket.on('dashboard_update', (data: DashboardUpdate) => {
        console.log('Dashboard update received:', data);
        this.emit('dashboard_update', data);
      });

      // AMI events
      this.socket.on('ami_event', (event: AMIEvent) => {
        console.log('AMI event received:', event.Event);
        this.emit('ami_event', event);

        // Emit specific events
        this.emit(`ami_event_${event.Event.toLowerCase()}`, event);
      });

      // Timeout for initial connection
      setTimeout(() => {
        if (!this.socket?.connected && this.isConnecting) {
          this.isConnecting = false;
          this.disconnect();
          reject(new Error('Connection timeout'));
        }
      }, 10000); // 10 seconds timeout
    });
  }

  // Reconnect
  async reconnect(): Promise<void> {
    console.log('Attempting to reconnect WebSocket...');
    this.disconnect();
    const user = localStorage.getItem('user');
    const tenantId = user ? JSON.parse(user).tenantId : undefined;
    return this.connect(tenantId);
  }

  // Disconnect from WebSocket server
  disconnect(): void {
    if (this.socket) {
      console.log('Disconnecting WebSocket...');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
  }

  // Subscribe to dashboard updates
  subscribeDashboard(tenantId: number): void {
    if (!this.socket?.connected) {
      console.error('WebSocket not connected');
      return;
    }

    console.log('Subscribing to dashboard updates for tenant:', tenantId);
    this.socket.emit('subscribe_dashboard', { tenantId });
  }

  // Unsubscribe from dashboard updates
  unsubscribeDashboard(tenantId: number): void {
    if (!this.socket?.connected) {
      console.error('WebSocket not connected');
      return;
    }

    console.log('Unsubscribing from dashboard updates for tenant:', tenantId);
    this.socket.emit('unsubscribe_dashboard', { tenantId });
  }

  // Add event listener
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  // Remove event listener
  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  // Emit event to local listeners
  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Send custom event to server
  send(event: string, data: any): void {
    if (!this.socket?.connected) {
      console.error('WebSocket not connected');
      return;
    }

    this.socket.emit(event, data);
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Get connection state
  getState(): 'connected' | 'connecting' | 'disconnected' {
    if (this.socket?.connected) return 'connected';
    if (this.isConnecting) return 'connecting';
    return 'disconnected';
  }
}

// Export singleton instance
const wsManager = new WebSocketManager();
export default wsManager;