import apiClient, { type ApiResponse } from './config';

// ============================================================================
// Channel/Call Interfaces
// ============================================================================

export enum ChannelState {
  DOWN = 'Down',
  RESERVED = 'Rsrvd',
  OFF_HOOK = 'OffHook',
  DIALING = 'Dialing',
  RING = 'Ring',
  RINGING = 'Ringing',
  UP = 'Up',
  BUSY = 'Busy',
}

export enum CallDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export interface ChannelCaller {
  name: string;
  number: string;
}

export interface ChannelDialplan {
  context: string;
  exten: string;
  priority: number;
}

export interface Channel {
  id: string;
  name: string;
  state: ChannelState;
  caller: ChannelCaller;
  connected: ChannelCaller;
  accountcode: string;
  dialplan: ChannelDialplan;
  creationtime: string;
  language: string;
}

export interface ChannelFilterDto {
  state?: ChannelState;
  callerId?: string;
  direction?: CallDirection;
}

// ============================================================================
// Originate Call (Click-to-Dial)
// ============================================================================

export interface OriginateCallDto {
  endpoint: string;
  extension: string;
  context?: string;
  timeout?: number;
  callerIdName?: string;
  callerIdNumber?: string;
  variables?: Record<string, string>;
}

export interface OriginateCallResponse {
  channelId: string;
}

// ============================================================================
// Transfer
// ============================================================================

export interface BlindTransferDto {
  channelName: string;
  extension: string;
  context: string;
}

// ============================================================================
// Recording
// ============================================================================

export interface StartRecordingDto {
  channelId: string;
  name: string;
  format?: string;
  maxDurationSeconds?: number;
  maxSilenceSeconds?: number;
}

export interface Recording {
  id: number;
  tenantId: number;
  uniqueid: string;
  filename: string;
  filepath: string;
  format: string;
  duration: number;
  filesize: number;
  src: string;
  dst: string;
  notes?: string;
  createdAt: string;
  isDeleted: boolean;
}

// ============================================================================
// Queue Calls
// ============================================================================

export interface QueueCall {
  position: number;
  channel: string;
  caller_id_num: string;
  caller_id_name: string;
  wait_time: number;
  priority: number;
}

export interface QueueCallsResponse {
  queue_name: string;
  display_name: string;
  calls_count: number;
  calls: QueueCall[];
  retrieved_at: string;
}

// ============================================================================
// Constants
// ============================================================================

export const CHANNEL_STATES = [
  { value: ChannelState.DOWN, label: 'Down', color: 'gray' },
  { value: ChannelState.RESERVED, label: 'Reserved', color: 'yellow' },
  { value: ChannelState.OFF_HOOK, label: 'Off Hook', color: 'blue' },
  { value: ChannelState.DIALING, label: 'Dialing', color: 'blue' },
  { value: ChannelState.RING, label: 'Ring', color: 'orange' },
  { value: ChannelState.RINGING, label: 'Ringing', color: 'orange' },
  { value: ChannelState.UP, label: 'Up (Active)', color: 'green' },
  { value: ChannelState.BUSY, label: 'Busy', color: 'red' },
];

export const CALL_DIRECTIONS = [
  { value: CallDirection.INBOUND, label: 'Entrant', icon: 'PhoneIncoming' },
  { value: CallDirection.OUTBOUND, label: 'Sortant', icon: 'PhoneOutgoing' },
];

export const RECORDING_FORMATS = [
  { value: 'wav', label: 'WAV (Uncompressed)' },
  { value: 'gsm', label: 'GSM (Compressed)' },
  { value: 'wav49', label: 'WAV49' },
  { value: 'ulaw', label: 'μ-law' },
];

// ============================================================================
// Calls Service
// ============================================================================

class CallsService {
  // ========================================
  // Channels Management
  // ========================================

  async getAllChannels(filters?: ChannelFilterDto): Promise<Channel[]> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.state) params.append('state', filters.state);
      if (filters.callerId) params.append('callerId', filters.callerId);
      if (filters.direction) params.append('direction', filters.direction);
    }

    const queryString = params.toString();
    const url = `/channels${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get<ApiResponse<Channel[]>>(url);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch channels');
  }

  async getChannelById(channelId: string): Promise<Channel> {
    const response = await apiClient.get<ApiResponse<Channel>>(`/channels/${encodeURIComponent(channelId)}`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to fetch channel ${channelId}`);
  }

  // ========================================
  // Call Control
  // ========================================

  async hangupChannel(channelId: string, reason?: string): Promise<void> {
    const params = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    const response = await apiClient.delete<ApiResponse<void>>(
      `/channels/${encodeURIComponent(channelId)}${params}`
    );

    if (!response.data.success) {
      throw new Error(`Failed to hangup channel ${channelId}`);
    }
  }

  async holdChannel(channelId: string): Promise<void> {
    const response = await apiClient.patch<ApiResponse<void>>(
      `/channels/${encodeURIComponent(channelId)}/hold`
    );

    if (!response.data.success) {
      throw new Error(`Failed to hold channel ${channelId}`);
    }
  }

  async unholdChannel(channelId: string): Promise<void> {
    const response = await apiClient.patch<ApiResponse<void>>(
      `/channels/${encodeURIComponent(channelId)}/unhold`
    );

    if (!response.data.success) {
      throw new Error(`Failed to unhold channel ${channelId}`);
    }
  }

  async muteChannel(channelId: string, direction: 'in' | 'out' | 'both' = 'both'): Promise<void> {
    const response = await apiClient.patch<ApiResponse<void>>(
      `/channels/${encodeURIComponent(channelId)}/mute?direction=${direction}`
    );

    if (!response.data.success) {
      throw new Error(`Failed to mute channel ${channelId}`);
    }
  }

  async unmuteChannel(channelId: string, direction: 'in' | 'out' | 'both' = 'both'): Promise<void> {
    const response = await apiClient.patch<ApiResponse<void>>(
      `/channels/${encodeURIComponent(channelId)}/unmute?direction=${direction}`
    );

    if (!response.data.success) {
      throw new Error(`Failed to unmute channel ${channelId}`);
    }
  }

  async answerChannel(channelId: string): Promise<void> {
    const response = await apiClient.patch<ApiResponse<void>>(
      `/channels/${encodeURIComponent(channelId)}/answer`
    );

    if (!response.data.success) {
      throw new Error(`Failed to answer channel ${channelId}`);
    }
  }

  // ========================================
  // Originate Call (Click-to-Dial)
  // ========================================

  async originateCall(data: OriginateCallDto): Promise<OriginateCallResponse> {
    const response = await apiClient.post<ApiResponse<OriginateCallResponse>>(
      '/channels/originate',
      data
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to originate call');
  }

  // ========================================
  // Transfer
  // ========================================

  async blindTransfer(data: BlindTransferDto): Promise<void> {
    const response = await apiClient.post<ApiResponse<void>>(
      '/asterisk/transfer/blind',
      data
    );

    if (!response.data.success) {
      throw new Error('Failed to perform blind transfer');
    }
  }

  // ========================================
  // Recording
  // ========================================

  async startRecording(data: StartRecordingDto): Promise<Recording> {
    const response = await apiClient.post<ApiResponse<Recording>>('/recordings/start', data);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to start recording');
  }

  async stopRecording(recordingName: string): Promise<void> {
    const response = await apiClient.post<ApiResponse<void>>(
      `/recordings/stop/${encodeURIComponent(recordingName)}`
    );

    if (!response.data.success) {
      throw new Error(`Failed to stop recording ${recordingName}`);
    }
  }

  // ========================================
  // Queue Calls
  // ========================================

  async getQueueCalls(queueName: string): Promise<QueueCallsResponse> {
    const response = await apiClient.get<ApiResponse<QueueCallsResponse>>(
      `/queues/${encodeURIComponent(queueName)}/calls`
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to fetch calls for queue ${queueName}`);
  }

  // ========================================
  // Helper Methods
  // ========================================

  getChannelStateLabel(state: ChannelState): string {
    const found = CHANNEL_STATES.find((s) => s.value === state);
    return found ? found.label : state;
  }

  getChannelStateColor(state: ChannelState): string {
    const found = CHANNEL_STATES.find((s) => s.value === state);
    return found ? found.color : 'gray';
  }

  getCallDirectionLabel(direction: CallDirection): string {
    const found = CALL_DIRECTIONS.find((d) => d.value === direction);
    return found ? found.label : direction;
  }

  formatCallDuration(creationtime: string): string {
    const start = new Date(creationtime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    const seconds = diffSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  formatCallDurationHHMMSS(creationtime: string): string {
    const start = new Date(creationtime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    const seconds = diffSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  formatWaitTime(waitTimeSeconds: number): string {
    const minutes = Math.floor(waitTimeSeconds / 60);
    const seconds = waitTimeSeconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  extractEndpointFromChannel(channelName: string): string {
    // Format: PJSIP/t1_101-00000001 -> 101
    const match = channelName.match(/PJSIP\/t\d+_(\d+)-/);
    return match ? match[1] : '';
  }

  isInboundCall(channel: Channel): boolean {
    // Simple heuristic: if caller number exists and is external
    // This can be improved based on your dialplan logic
    return channel.caller.number !== '' && !channel.caller.number.match(/^[1-9]\d{2,3}$/);
  }

  getCallDirection(channel: Channel): CallDirection {
    return this.isInboundCall(channel) ? CallDirection.INBOUND : CallDirection.OUTBOUND;
  }

  formatCallerId(clid: string): { name: string; number: string } {
    // Parse CLID format: "John Doe" <1234567890>
    const match = clid.match(/"([^"]*)" <(.*)>/);
    if (match) {
      return { name: match[1], number: match[2] };
    }

    // Simple number
    if (clid.match(/^\d+$/)) {
      return { name: '', number: clid };
    }

    return { name: clid, number: '' };
  }

  getChannelIcon(state: ChannelState): string {
    switch (state) {
      case ChannelState.UP:
        return 'Phone';
      case ChannelState.RINGING:
      case ChannelState.RING:
        return 'PhoneIncoming';
      case ChannelState.DIALING:
        return 'PhoneOutgoing';
      case ChannelState.BUSY:
        return 'PhoneMissed';
      case ChannelState.DOWN:
        return 'PhoneOff';
      default:
        return 'Phone';
    }
  }

  canHangup(userRole: string): boolean {
    return ['ADMIN', 'TENANT_ADMIN', 'SUPERVISOR'].includes(userRole);
  }

  canMute(userRole: string): boolean {
    return ['ADMIN', 'TENANT_ADMIN', 'SUPERVISOR'].includes(userRole);
  }

  canRecord(userRole: string): boolean {
    return ['ADMIN', 'TENANT_ADMIN', 'SUPERVISOR'].includes(userRole);
  }

  canOriginate(userRole: string): boolean {
    return ['ADMIN', 'TENANT_ADMIN', 'SUPERVISOR', 'AGENT'].includes(userRole);
  }

  canTransfer(userRole: string): boolean {
    return ['ADMIN', 'TENANT_ADMIN', 'SUPERVISOR', 'AGENT'].includes(userRole);
  }

  canHoldUnhold(userRole: string): boolean {
    return ['ADMIN', 'TENANT_ADMIN', 'SUPERVISOR', 'AGENT'].includes(userRole);
  }
}

export default new CallsService();
