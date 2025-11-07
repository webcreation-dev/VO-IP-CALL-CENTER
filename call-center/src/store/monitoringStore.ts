import { create } from 'zustand';
import wsManager, { type DashboardUpdate, type AMIEvent } from '../api/websocket';

interface MonitoringState {
  // Connection state
  isConnected: boolean;
  connectionState: 'connected' | 'connecting' | 'disconnected';
  lastUpdate: string | null;

  // Dashboard data
  dashboardData: DashboardUpdate | null;

  // AMI events buffer (last 100 events)
  amiEvents: AMIEvent[];
  maxEvents: number;

  // Statistics
  stats: {
    totalCalls: number;
    activeCalls: number;
    waitingCalls: number;
    completedCalls: number;
    abandonedCalls: number;
    avgWaitTime: number;
    longestWaitTime: number;
  };

  // Queues real-time data
  queuesRealtime: Map<string, {
    waitingCalls: number;
    availableAgents: number;
    busyAgents: number;
    pausedAgents: number;
    avgWaitTime: number;
    serviceLevelPerf: number;
  }>;

  // Agents real-time data
  agentsRealtime: Map<string, {
    id: string;
    name: string;
    state: string;
    stateTime: number;
    callsTaken: number;
    lastCall: number;
  }>;

  // Active channels
  activeChannels: Array<{
    id: string;
    channel: string;
    state: string;
    callerNum: string;
    callerName: string;
    connectedNum: string;
    duration: number;
  }>;

  // Actions
  connect: (tenantId?: number) => Promise<void>;
  disconnect: () => void;
  subscribeToDashboard: (tenantId: number) => void;
  unsubscribeFromDashboard: (tenantId: number) => void;
  updateDashboard: (data: DashboardUpdate) => void;
  addAMIEvent: (event: AMIEvent) => void;
  clearAMIEvents: () => void;
  setConnectionState: (state: 'connected' | 'connecting' | 'disconnected') => void;
}

const useMonitoringStore = create<MonitoringState>((set, get) => ({
  // Initial state
  isConnected: false,
  connectionState: 'disconnected',
  lastUpdate: null,
  dashboardData: null,
  amiEvents: [],
  maxEvents: 100,
  stats: {
    totalCalls: 0,
    activeCalls: 0,
    waitingCalls: 0,
    completedCalls: 0,
    abandonedCalls: 0,
    avgWaitTime: 0,
    longestWaitTime: 0
  },
  queuesRealtime: new Map(),
  agentsRealtime: new Map(),
  activeChannels: [],

  // Connect to WebSocket
  connect: async (tenantId) => {
    set({ connectionState: 'connecting' });

    try {
      await wsManager.connect(tenantId);

      // Setup event listeners
      wsManager.on('connected', () => {
        set({ isConnected: true, connectionState: 'connected' });
      });

      wsManager.on('disconnected', () => {
        set({ isConnected: false, connectionState: 'disconnected' });
      });

      wsManager.on('dashboard_update', (data: DashboardUpdate) => {
        get().updateDashboard(data);
      });

      wsManager.on('ami_event', (event: AMIEvent) => {
        get().addAMIEvent(event);
      });

      wsManager.on('error', (error: any) => {
        console.error('WebSocket error:', error);
        set({ connectionState: 'disconnected', isConnected: false });
      });

      set({ isConnected: true, connectionState: 'connected' });
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      set({ isConnected: false, connectionState: 'disconnected' });
      throw error;
    }
  },

  // Disconnect from WebSocket
  disconnect: () => {
    wsManager.disconnect();
    set({
      isConnected: false,
      connectionState: 'disconnected',
      dashboardData: null,
      lastUpdate: null
    });
  },

  // Subscribe to dashboard updates
  subscribeToDashboard: (tenantId) => {
    wsManager.subscribeDashboard(tenantId);
  },

  // Unsubscribe from dashboard updates
  unsubscribeFromDashboard: (tenantId) => {
    wsManager.unsubscribeDashboard(tenantId);
  },

  // Update dashboard data
  updateDashboard: (data) => {
    const queuesMap = new Map();
    const agentsMap = new Map();

    // Update queues map
    if (data.queues) {
      data.queues.forEach(queue => {
        queuesMap.set(queue.name, queue);
      });
    }

    // Update agents map
    if (data.agents) {
      data.agents.forEach(agent => {
        agentsMap.set(agent.id, agent);
      });
    }

    set({
      dashboardData: data,
      lastUpdate: data.timestamp,
      stats: data.stats || get().stats,
      queuesRealtime: queuesMap,
      agentsRealtime: agentsMap,
      activeChannels: data.activeChannels || []
    });
  },

  // Add AMI event to buffer
  addAMIEvent: (event) => {
    set((state) => {
      const events = [...state.amiEvents, event];
      // Keep only last maxEvents
      if (events.length > state.maxEvents) {
        events.splice(0, events.length - state.maxEvents);
      }
      return { amiEvents: events };
    });
  },

  // Clear AMI events
  clearAMIEvents: () => {
    set({ amiEvents: [] });
  },

  // Set connection state
  setConnectionState: (state) => {
    set({
      connectionState: state,
      isConnected: state === 'connected'
    });
  }
}));

export default useMonitoringStore;