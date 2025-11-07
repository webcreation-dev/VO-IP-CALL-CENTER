import apiClient, { type ApiResponse } from './config';

// ============================================================================
// CDR (Call Detail Records) Interfaces
// ============================================================================

export enum CallDisposition {
  ANSWERED = 'ANSWERED',
  NO_ANSWER = 'NO ANSWER',
  BUSY = 'BUSY',
  FAILED = 'FAILED',
  CONGESTION = 'CONGESTION',
}

export enum CallDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export interface CdrRecord {
  id: number;
  tenantId: number;
  calldate: string;
  clid: string;
  src: string;
  dst: string;
  dcontext: string;
  channel: string;
  dstchannel: string;
  lastapp: string;
  lastdata: string;
  duration: number;
  billsec: number;
  disposition: CallDisposition;
  amaflags: number;
  accountcode: string;
  uniqueid: string;
  linkedid: string;
  sequence: number;
  userfield: string;
  peeraccount: string;
}

export interface CdrFilterDto {
  tenantId?: number;
  src?: string;
  dst?: string;
  disposition?: CallDisposition;
  startDate?: string;
  endDate?: string;
  minDuration?: number;
  maxDuration?: number;
  direction?: CallDirection;
  accountcode?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export interface CdrListResponse {
  data: CdrRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface CdrStats {
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  avgDuration: number;
  totalBillsec: number;
  answerRate: number;
}

// ============================================================================
// Statistics Interfaces
// ============================================================================

export interface CallStatistics {
  total_calls: number;
  answered_calls: number;
  failed_calls: number;
  answer_rate_percent: number;
  total_duration_seconds: number;
  total_billable_seconds: number;
  avg_duration_seconds: number;
  active_calls_now: number;
}

export interface QueueStatistics {
  queue_name: string;
  total_calls: number;
  strategy: string;
  timeout: number;
}

export interface EndpointStatistics {
  total_endpoints: number;
  registered_endpoints: number;
}

export interface RecordingStatistics {
  total_recordings: number;
  total_size_bytes: number;
  total_duration_seconds: number;
  avg_duration_seconds: number;
}

export interface TopCaller {
  number: string;
  call_count: number;
  total_duration_seconds: number;
  avg_duration_seconds: number;
}

export interface TopDestination {
  number: string;
  call_count: number;
  total_duration_seconds: number;
  avg_duration_seconds: number;
}

export interface TrendDataPoint {
  period: string;
  total_calls: number;
  answered_calls: number;
  failed_calls: number;
  answer_rate_percent: number;
}

export interface ActiveChannel {
  id: string;
  name: string;
  state: string;
  caller: {
    name: string;
    number: string;
  };
  connected: {
    name: string;
    number: string;
  };
  creationtime: string;
}

export interface ActiveChannelsResponse {
  active_channels: number;
  active_calls: number;
  channels: ActiveChannel[];
}

export interface DashboardStatistics {
  calls: CallStatistics;
  queues: {
    total_queues: number;
    queues: QueueStatistics[];
  };
  endpoints: EndpointStatistics;
  recordings: RecordingStatistics;
  trend: TrendDataPoint[];
}

export interface SummaryStatistics {
  total_calls: number;
  answered_calls: number;
  answer_rate: number;
  active_calls: number;
  queues_count: number;
  endpoints_registered: number;
}

// ============================================================================
// Filter DTOs
// ============================================================================

export interface StatisticsFilterDto {
  tenant_id?: number;
  start_date?: string;
  end_date?: string;
}

export interface TrendFilterDto extends StatisticsFilterDto {
  group_by?: 'hour' | 'day' | 'week' | 'month';
}

export interface TopPerformersFilterDto extends StatisticsFilterDto {
  limit?: number;
}

// ============================================================================
// Quick Date Range Presets
// ============================================================================

export enum DateRangePreset {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  THIS_MONTH = 'this_month',
  LAST_MONTH = 'last_month',
  CUSTOM = 'custom',
}

export const DATE_RANGE_PRESETS = [
  { value: DateRangePreset.TODAY, label: "Aujourd'hui" },
  { value: DateRangePreset.YESTERDAY, label: 'Hier' },
  { value: DateRangePreset.LAST_7_DAYS, label: '7 derniers jours' },
  { value: DateRangePreset.LAST_30_DAYS, label: '30 derniers jours' },
  { value: DateRangePreset.THIS_MONTH, label: 'Ce mois-ci' },
  { value: DateRangePreset.LAST_MONTH, label: 'Mois dernier' },
  { value: DateRangePreset.CUSTOM, label: 'Personnalisé' },
];

export const CALL_DISPOSITIONS = [
  { value: CallDisposition.ANSWERED, label: 'Répondu', color: 'green' },
  { value: CallDisposition.NO_ANSWER, label: 'Non répondu', color: 'yellow' },
  { value: CallDisposition.BUSY, label: 'Occupé', color: 'orange' },
  { value: CallDisposition.FAILED, label: 'Échoué', color: 'red' },
  { value: CallDisposition.CONGESTION, label: 'Congestion', color: 'red' },
];

export const CALL_DIRECTIONS = [
  { value: CallDirection.INBOUND, label: 'Entrant' },
  { value: CallDirection.OUTBOUND, label: 'Sortant' },
];

// ============================================================================
// Reports Service
// ============================================================================

class ReportsService {
  // ========================================
  // CDR (Call Detail Records)
  // ========================================

  async getCdrRecords(filters?: CdrFilterDto): Promise<CdrListResponse> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.tenantId) params.append('tenantId', String(filters.tenantId));
      if (filters.src) params.append('src', filters.src);
      if (filters.dst) params.append('dst', filters.dst);
      if (filters.disposition) params.append('disposition', filters.disposition);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.minDuration !== undefined) params.append('minDuration', String(filters.minDuration));
      if (filters.maxDuration !== undefined) params.append('maxDuration', String(filters.maxDuration));
      if (filters.direction) params.append('direction', filters.direction);
      if (filters.accountcode) params.append('accountcode', filters.accountcode);
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.search) params.append('search', filters.search);
    }

    const queryString = params.toString();
    const url = `/cdr${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get<ApiResponse<CdrListResponse>>(url);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch CDR records');
  }

  async getCdrStats(filters?: StatisticsFilterDto): Promise<CdrStats> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.tenant_id) params.append('tenantId', String(filters.tenant_id));
      if (filters.start_date) params.append('startDate', filters.start_date);
      if (filters.end_date) params.append('endDate', filters.end_date);
    }

    const queryString = params.toString();
    const url = `/cdr/stats${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get<ApiResponse<CdrStats>>(url);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch CDR statistics');
  }

  async exportCdrToCsv(filters?: CdrFilterDto): Promise<Blob> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.tenantId) params.append('tenantId', String(filters.tenantId));
      if (filters.src) params.append('src', filters.src);
      if (filters.dst) params.append('dst', filters.dst);
      if (filters.disposition) params.append('disposition', filters.disposition);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.minDuration !== undefined) params.append('minDuration', String(filters.minDuration));
      if (filters.maxDuration !== undefined) params.append('maxDuration', String(filters.maxDuration));
      if (filters.direction) params.append('direction', filters.direction);
    }

    const queryString = params.toString();
    const url = `/cdr/export/csv${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get(url, {
      responseType: 'blob',
    });

    return response.data;
  }

  // ========================================
  // Statistics
  // ========================================

  async getDashboardStats(filters?: StatisticsFilterDto): Promise<DashboardStatistics> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.tenant_id) params.append('tenant_id', String(filters.tenant_id));
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
    }

    const queryString = params.toString();
    const url = `/statistics/dashboard${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get<ApiResponse<DashboardStatistics>>(url);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch dashboard statistics');
  }

  async getSummaryStats(): Promise<SummaryStatistics> {
    const response = await apiClient.get<ApiResponse<SummaryStatistics>>('/statistics/summary');

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch summary statistics');
  }

  async getCallStats(filters?: StatisticsFilterDto): Promise<CallStatistics> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.tenant_id) params.append('tenant_id', String(filters.tenant_id));
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
    }

    const queryString = params.toString();
    const url = `/statistics/calls${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get<ApiResponse<CallStatistics>>(url);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch call statistics');
  }

  async getTrendData(filters?: TrendFilterDto): Promise<TrendDataPoint[]> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.tenant_id) params.append('tenant_id', String(filters.tenant_id));
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.group_by) params.append('group_by', filters.group_by);
    }

    const queryString = params.toString();
    const url = `/statistics/trend${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get<ApiResponse<TrendDataPoint[]>>(url);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch trend data');
  }

  async getTopCallers(filters?: TopPerformersFilterDto): Promise<TopCaller[]> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.tenant_id) params.append('tenant_id', String(filters.tenant_id));
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.limit) params.append('limit', String(filters.limit));
    }

    const queryString = params.toString();
    const url = `/statistics/top-callers${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get<ApiResponse<TopCaller[]>>(url);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch top callers');
  }

  async getTopDestinations(filters?: TopPerformersFilterDto): Promise<TopDestination[]> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.tenant_id) params.append('tenant_id', String(filters.tenant_id));
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.limit) params.append('limit', String(filters.limit));
    }

    const queryString = params.toString();
    const url = `/statistics/top-called${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get<ApiResponse<TopDestination[]>>(url);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch top destinations');
  }

  async getActiveChannels(): Promise<ActiveChannelsResponse> {
    const response = await apiClient.get<ApiResponse<ActiveChannelsResponse>>('/statistics/active-channels');

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch active channels');
  }

  // ========================================
  // Helper Methods
  // ========================================

  getDispositionLabel(disposition: CallDisposition): string {
    const found = CALL_DISPOSITIONS.find((d) => d.value === disposition);
    return found ? found.label : disposition;
  }

  getDispositionColor(disposition: CallDisposition): string {
    const found = CALL_DISPOSITIONS.find((d) => d.value === disposition);
    return found ? found.color : 'gray';
  }

  getDirectionLabel(direction: CallDirection): string {
    const found = CALL_DIRECTIONS.find((d) => d.value === direction);
    return found ? found.label : direction;
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  }

  formatDurationHHMMSS(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(2)}%`;
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  getDateRangeFromPreset(preset: DateRangePreset): { start_date: string; end_date: string } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let start: Date;
    let end: Date = now;

    switch (preset) {
      case DateRangePreset.TODAY:
        start = today;
        break;

      case DateRangePreset.YESTERDAY:
        start = new Date(today);
        start.setDate(start.getDate() - 1);
        end = new Date(today);
        end.setSeconds(end.getSeconds() - 1);
        break;

      case DateRangePreset.LAST_7_DAYS:
        start = new Date(today);
        start.setDate(start.getDate() - 6);
        break;

      case DateRangePreset.LAST_30_DAYS:
        start = new Date(today);
        start.setDate(start.getDate() - 29);
        break;

      case DateRangePreset.THIS_MONTH:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;

      case DateRangePreset.LAST_MONTH:
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;

      default:
        start = new Date(today);
        start.setDate(start.getDate() - 6);
    }

    return {
      start_date: start.toISOString(),
      end_date: end.toISOString(),
    };
  }

  downloadCsv(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export default new ReportsService();
