import apiClient, { type ApiResponse } from './config';

// Queue Strategy Enum
export enum QueueStrategy {
  RINGALL = 'ringall',
  LEASTRECENT = 'leastrecent',
  FEWESTCALLS = 'fewestcalls',
  RANDOM = 'random',
  RRMEMORY = 'rrmemory',
}

// Queue Visual State
export type QueueVisualState = 'idle' | 'active' | 'busy' | 'critical';

// Basic Queue Interface (from DB)
export interface Queue {
  name: string;
  tenantId: number;
  description?: string;
  strategy: QueueStrategy;
  timeout: number;
  retry: number;
  maxlen: number;
  weight: number;
  wrapuptime: number;
  musiconhold?: string;
  servicelevel: number;
  context?: string;
  createdAt: string;
  updatedAt: string;
}

// Enriched Queue (with real-time stats from AMI)
export interface QueueEnriched extends Queue {
  // Call statistics
  calls_waiting: number;
  calls_completed: number;
  calls_abandoned: number;
  calls_total: number;
  avg_holdtime: number;
  avg_talktime: number;
  longest_wait_time: number;
  service_level_perf: number;

  // Member statistics
  members_total: number;
  members_available: number;
  members_in_call: number;
  members_paused: number;
  members_unavailable: number;

  // Calculated metrics
  abandonment_rate: number;
  agent_utilization: number;

  // Visual state
  visual_state: QueueVisualState;

  // Metadata
  ami_connected: boolean;
  ami_data_available: boolean;
  enriched_at: string;
}

// Waiting Call Interface
export interface WaitingCall {
  position: number;
  channel: string;
  caller_id_num: string;
  caller_id_name: string;
  wait_time: number;
  priority: number;
}

// Queue Calls Response
export interface QueueCalls {
  queue_name: string;
  calls_count: number;
  calls: WaitingCall[];
  retrieved_at: string;
}

// Global Stats Interface
export interface GlobalStats {
  total_queues: number;
  total_calls_waiting: number;
  total_calls_completed: number;
  total_calls_abandoned: number;
  total_calls_handled: number;
  total_members: number;
  members_available: number;
  members_in_call: number;
  members_paused: number;
  members_unavailable: number;
  avg_holdtime_global: number;
  avg_talktime_global: number;
  longest_wait_time_global: number;
  global_abandonment_rate: number;
  global_agent_utilization: number;
  queues_idle: number;
  queues_active: number;
  queues_busy: number;
  queues_critical: number;
  top_busy_queues: Array<{
    queue_name: string;
    calls_waiting: number;
    longest_wait_time: number;
    members_available: number;
  }>;
  retrieved_at: string;
}

// Queue Routing Rule (for automatic extension creation)
export interface QueueRoutingRule {
  extensionPattern: string;    // Required: Asterisk pattern (e.g., "_3XXX", "3000")
  priority?: number;           // Optional: Dialplan priority (default: 1)
  queueOptions?: string;       // Optional: Queue options (e.g., "t", "r", "tr")
}

// Create Queue DTO
export interface CreateQueueDto {
  tenantId?: number;           // For ADMIN
  name: string;                // Required, 3-128 chars
  description?: string;        // Optional
  strategy?: QueueStrategy;    // Default: ringall
  timeout?: number;            // Default: 15 (1-300 seconds)
  retry?: number;              // Default: 5 (0-60 seconds)
  maxlen?: number;             // Default: 0 (unlimited)
  wrapuptime?: number;         // Default: 0 (0-3600 seconds)
  musicclass?: string;         // Optional, max 80 chars
  servicelevel?: number;       // Default: 60 (1+ seconds)
  context: string;             // REQUIRED: Dialplan context (must belong to tenant)
  routingRules?: QueueRoutingRule[];  // OPTIONAL: Extension routing rules
}

// Update Queue DTO
export interface UpdateQueueDto {
  description?: string;
  strategy?: QueueStrategy;
  timeout?: number;
  retry?: number;
  maxlen?: number;
  wrapuptime?: number;
  musicclass?: string;
  servicelevel?: number;
  isActive?: boolean;
  context?: string;             // OPTIONAL: Update dialplan context
}

// Queue Member Interface
export interface QueueMember {
  interface: string;           // PJSIP/t1_101
  member_name?: string;        // Display name
  status: string;              // Member status
  paused: boolean;             // Is paused?
  paused_reason?: string;      // Pause reason
  penalty: number;             // Queue penalty
  calls_taken: number;         // Calls handled
  last_call: number;           // Last call timestamp
  in_call: boolean;            // Currently in call?
  state_interface?: string;    // Device state interface
}

// Add Member DTO
export interface AddMemberDto {
  interface: string;           // Required: PJSIP/t1_101 or t1_101
  memberName?: string;         // Optional display name
  penalty?: number;            // Optional penalty (default: 0)
  paused?: boolean;            // Optional initial pause state
}

// Pause Member DTO
export interface PauseMemberDto {
  paused: boolean;             // true to pause, false to unpause
  reason?: string;             // Optional pause reason
}

// Queue Strategies for Select Options
export const QUEUE_STRATEGIES = [
  { value: QueueStrategy.RINGALL, label: 'Ring All (tous les agents sonnent)' },
  { value: QueueStrategy.LEASTRECENT, label: 'Least Recent (agent moins récent)' },
  { value: QueueStrategy.FEWESTCALLS, label: 'Fewest Calls (agent avec moins d\'appels)' },
  { value: QueueStrategy.RANDOM, label: 'Random (aléatoire)' },
  { value: QueueStrategy.RRMEMORY, label: 'Round Robin Memory (rotation avec mémoire)' },
];

class QueuesService {
  // Get all queues (basic)
  async getAll(): Promise<Queue[]> {
    const response = await apiClient.get<ApiResponse<Queue[]>>('/queues');

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch queues');
  }

  // Get enriched queues (with real-time stats)
  async getEnriched(): Promise<QueueEnriched[]> {
    const response = await apiClient.get<ApiResponse<QueueEnriched[]>>('/queues/enriched');

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch enriched queues');
  }

  // Get global statistics
  async getGlobalStats(): Promise<GlobalStats> {
    const response = await apiClient.get<ApiResponse<GlobalStats>>('/queues/stats/global');

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch global stats');
  }

  // Get queue by name
  async getByName(name: string): Promise<Queue> {
    const response = await apiClient.get<ApiResponse<Queue>>(`/queues/${name}`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to fetch queue ${name}`);
  }

  // Get queue with stats
  async getStats(name: string): Promise<QueueEnriched> {
    const response = await apiClient.get<ApiResponse<QueueEnriched>>(`/queues/${name}/stats`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to fetch queue stats for ${name}`);
  }

  // Get waiting calls in queue
  async getCalls(name: string): Promise<QueueCalls> {
    const response = await apiClient.get<ApiResponse<QueueCalls>>(`/queues/${name}/calls`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to fetch calls for queue ${name}`);
  }

  // Create new queue
  async create(data: CreateQueueDto): Promise<Queue> {
    const response = await apiClient.post<ApiResponse<Queue>>('/queues', data);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to create queue');
  }

  // Update queue
  async update(name: string, data: UpdateQueueDto): Promise<Queue> {
    const response = await apiClient.patch<ApiResponse<Queue>>(`/queues/${name}`, data);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to update queue ${name}`);
  }

  // Delete queue
  async delete(name: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/queues/${name}`);

    if (!response.data.success) {
      throw new Error(`Failed to delete queue ${name}`);
    }
  }

  // Reload queue
  async reload(name: string): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>(`/queues/${name}/reload`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to reload queue ${name}`);
  }

  // ========================================
  // Queue Members Management
  // ========================================

  // Get queue members
  async getMembers(queueName: string): Promise<QueueMember[]> {
    const response = await apiClient.get<ApiResponse<{ members: { list: QueueMember[] } }>>(
      `/queues/${encodeURIComponent(queueName)}/details`
    );

    if (response.data.success && response.data.data?.members?.list) {
      return response.data.data.members.list;
    }

    throw new Error(`Failed to fetch members for queue ${queueName}`);
  }

  // Add member to queue
  async addMember(queueName: string, data: AddMemberDto): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>(
      `/queues/${encodeURIComponent(queueName)}/members`,
      data
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to add member to queue ${queueName}`);
  }

  // Remove member from queue
  async removeMember(queueName: string, memberId: string): Promise<any> {
    const response = await apiClient.delete<ApiResponse<any>>(
      `/queues/${encodeURIComponent(queueName)}/members/${encodeURIComponent(memberId)}`
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to remove member from queue ${queueName}`);
  }

  // Pause/Unpause member in queue
  async pauseMember(queueName: string, memberId: string, data: PauseMemberDto): Promise<any> {
    const response = await apiClient.patch<ApiResponse<any>>(
      `/queues/${encodeURIComponent(queueName)}/members/${encodeURIComponent(memberId)}/pause`,
      data
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to pause/unpause member in queue ${queueName}`);
  }

  // ========================================
  // Helper Methods
  // ========================================

  // Helper: Get display name (strip tenant prefix)
  getDisplayName(queue: Queue | QueueEnriched): string {
    const match = queue.name.match(/^t\d+_(.+)$/);
    return match ? match[1] : queue.name;
  }

  // Helper: Get visual state badge variant
  getVisualStateBadgeVariant(state: QueueVisualState): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (state) {
      case 'idle': return 'secondary';
      case 'active': return 'default';
      case 'busy': return 'outline';
      case 'critical': return 'destructive';
      default: return 'secondary';
    }
  }

  // Helper: Get visual state label
  getVisualStateLabel(state: QueueVisualState): string {
    switch (state) {
      case 'idle': return 'Inactif';
      case 'active': return 'Actif';
      case 'busy': return 'Occupé';
      case 'critical': return 'Critique';
      default: return 'Inconnu';
    }
  }

  // Helper: Get strategy label
  getStrategyLabel(strategy: QueueStrategy | string): string {
    const found = QUEUE_STRATEGIES.find(s => s.value === strategy);
    return found ? found.label : String(strategy);
  }

  // Helper: Format time (seconds to mm:ss)
  formatTime(seconds: number): string {
    if (!seconds || seconds === 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Helper: Format percentage
  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  // Helper: Generate queue preview name
  generateQueuePreview(tenantId: number, name: string): string {
    if (!name) return `t${tenantId}_`;

    const normalized = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    return `t${tenantId}_${normalized}`;
  }
}

export default new QueuesService();