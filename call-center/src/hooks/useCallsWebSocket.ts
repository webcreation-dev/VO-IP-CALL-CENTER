import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import useAuthStore from '@/store/authStore';

// ============================================================================
// WebSocket Event Types
// ============================================================================

export interface DashboardStats {
  activeChannels: number;
  activeCalls: number;
  queueStats: {
    queueName: string;
    displayName: string;
    callsWaiting: number;
    membersAvailable: number;
    membersTotal: number;
  }[];
}

export interface AmiEvent {
  event: string;
  [key: string]: any;
}

export interface CallEvent extends AmiEvent {
  event: 'Newchannel' | 'Hangup' | 'DialBegin' | 'DialEnd' | 'QueueCallerJoin' | 'QueueCallerLeave';
  Channel?: string;
  Uniqueid?: string;
  CallerIDNum?: string;
  CallerIDName?: string;
  ChannelState?: string;
  ChannelStateDesc?: string;
  ConnectedLineNum?: string;
  ConnectedLineName?: string;
  Context?: string;
  Exten?: string;
  Cause?: string;
  CauseTxt?: string;
  Queue?: string;
  Position?: string;
  Count?: string;
}

// ============================================================================
// Hook State
// ============================================================================

export interface UseCallsWebSocketReturn {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  dashboardStats: DashboardStats | null;
  lastAmiEvent: CallEvent | null;
  subscribe: () => void;
  unsubscribe: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export default function useCallsWebSocket(): UseCallsWebSocketReturn {
  const { isAuthenticated, getTenantId, token } = useAuthStore();
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [lastAmiEvent, setLastAmiEvent] = useState<CallEvent | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const tenantIdRef = useRef<number | null>(null);

  // ========================================
  // Connect to WebSocket
  // ========================================

  const connect = () => {
    if (!isAuthenticated || !token) {
      setError('Not authenticated');
      return;
    }

    const tenantId = getTenantId();
    if (!tenantId) {
      setError('No tenant ID available');
      return;
    }

    tenantIdRef.current = tenantId;

    // Don't reconnect if already connected
    if (socketRef.current?.connected) {
      return;
    }

    setConnecting(true);
    setError(null);

    const apiUrl = import.meta.env.VITE_API_URL || 'http://pishon.kabou.bj:3001';
    const wsUrl = apiUrl.replace(/^http/, 'ws');

    const socket = io(`${wsUrl}/monitoring`, {
      auth: {
        token,
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    // ========================================
    // Event Listeners
    // ========================================

    socket.on('connect', () => {
      console.log('[CallsWebSocket] Connected to /monitoring namespace');
      setConnected(true);
      setConnecting(false);
      setError(null);

      // Subscribe to tenant room
      if (tenantIdRef.current) {
        socket.emit('subscribe', { tenantId: tenantIdRef.current });
        console.log(`[CallsWebSocket] Subscribed to tenant ${tenantIdRef.current}`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[CallsWebSocket] Disconnected:', reason);
      setConnected(false);
      setConnecting(false);

      if (reason === 'io server disconnect') {
        // Server disconnected us, reconnect manually
        socket.connect();
      }
    });

    socket.on('connect_error', (err) => {
      console.error('[CallsWebSocket] Connection error:', err);
      setError(`Connection error: ${err.message}`);
      setConnecting(false);
    });

    socket.on('error', (err) => {
      console.error('[CallsWebSocket] Socket error:', err);
      setError(typeof err === 'string' ? err : 'Socket error occurred');
    });

    // ========================================
    // Dashboard Stats Updates (every 5s)
    // ========================================

    socket.on('dashboard_update', (data: DashboardStats) => {
      console.log('[CallsWebSocket] Dashboard update:', data);
      setDashboardStats(data);
    });

    // ========================================
    // AMI Events (real-time call updates)
    // ========================================

    socket.on('ami_event', (event: CallEvent) => {
      console.log('[CallsWebSocket] AMI Event:', event.event, event);
      setLastAmiEvent(event);
    });

    socketRef.current = socket;
  };

  // ========================================
  // Disconnect
  // ========================================

  const disconnect = () => {
    if (socketRef.current) {
      if (tenantIdRef.current) {
        socketRef.current.emit('unsubscribe', { tenantId: tenantIdRef.current });
        console.log(`[CallsWebSocket] Unsubscribed from tenant ${tenantIdRef.current}`);
      }

      socketRef.current.disconnect();
      socketRef.current = null;
      tenantIdRef.current = null;
    }

    setConnected(false);
    setConnecting(false);
    setDashboardStats(null);
    setLastAmiEvent(null);
  };

  // ========================================
  // Subscribe/Unsubscribe (manual control)
  // ========================================

  const subscribe = () => {
    if (socketRef.current?.connected && tenantIdRef.current) {
      socketRef.current.emit('subscribe', { tenantId: tenantIdRef.current });
      console.log(`[CallsWebSocket] Manually subscribed to tenant ${tenantIdRef.current}`);
    }
  };

  const unsubscribe = () => {
    if (socketRef.current?.connected && tenantIdRef.current) {
      socketRef.current.emit('unsubscribe', { tenantId: tenantIdRef.current });
      console.log(`[CallsWebSocket] Manually unsubscribed from tenant ${tenantIdRef.current}`);
    }
  };

  // ========================================
  // Auto-connect on mount / auth change
  // ========================================

  useEffect(() => {
    if (isAuthenticated && token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, token]);

  // ========================================
  // Return hook state and controls
  // ========================================

  return {
    connected,
    connecting,
    error,
    dashboardStats,
    lastAmiEvent,
    subscribe,
    unsubscribe,
  };
}
