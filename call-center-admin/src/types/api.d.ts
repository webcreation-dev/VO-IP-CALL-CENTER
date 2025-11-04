// ============================================
// TYPES GLOBAUX
// ============================================

export type UserRole =
  | 'SUPER_ADMIN'
  | 'TENANT_ADMIN'
  | 'SUPERVISOR'
  | 'AGENT'
  | 'ADMIN';

export type QueueStrategy =
  | 'ringall'
  | 'leastrecent'
  | 'fewestcalls'
  | 'random'
  | 'rrmemory'
  | 'linear'
  | 'wrandom';

export type ChannelState =
  | 'Down'
  | 'Rsrvd'
  | 'OffHook'
  | 'Dialing'
  | 'Ring'
  | 'Ringing'
  | 'Up'
  | 'Busy'
  | 'Dialing Offhook'
  | 'Pre-ring'
  | 'Unknown';

export type IvrActionType =
  | 'queue'
  | 'endpoint'
  | 'submenu'
  | 'playback'
  | 'hangup'
  | 'voicemail'
  | 'callback'
  | 'external_api';

export type IvrConditionType =
  | 'time_of_day'
  | 'caller_id'
  | 'digit_count'
  | 'variable_check';

// ============================================
// AUTH
// ============================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: AppUser;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  role: UserRole;
  tenantId?: number;
}

// ============================================
// USER
// ============================================

export interface AppUser {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  tenantId?: number;
  phone?: string;
  endpointId?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// TENANT
// ============================================

export interface Tenant {
  id: number;
  name: string;
  domain?: string;
  maxEndpoints?: number;
  maxQueues?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateTenantRequest {
  name: string;
  domain?: string;
  maxEndpoints?: number;
  maxQueues?: number;
}

export interface TenantStats {
  endpointsCount: number;
  queuesCount: number;
  activeCallsCount: number;
  totalCalls: number;
}

// ============================================
// CONTEXT
// ============================================

export interface TenantContext {
  id: number;
  tenantId: number;
  name: string;
  description?: string;
  isPrimary: boolean;
  dialplanConfig: {
    allowInbound: boolean;
    allowOutbound: boolean;
    allowInternal: boolean;
    allowInterContext?: boolean;
    accessibleContexts?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateContextRequest {
  tenantId: number;
  name: string;
  description?: string;
  dialplanConfig: Record<string, any>;
}

// ============================================
// ENDPOINT (PJSIP)
// ============================================

export interface PsEndpoint {
  id: string;
  username: string;
  tenantId: number;
  context: string;
  displayName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PsAuth {
  id: string;
  username: string;
  password: string;
  displayName?: string;
}

export interface PsAor {
  id: string;
  maxContacts: number;
  displayName?: string;
}

export interface CreateEndpointRequest {
  username: string;
  password: string;
  displayName?: string;
  tenantId: number;
  context: string;
  maxContacts?: number;
}

export interface EndpointStatus {
  username: string;
  status: 'online' | 'offline' | 'busy';
  ip?: string;
  port?: number;
  userAgent?: string;
  latency?: number;
  registeredAt?: string;
}

export interface EnrichedEndpoint extends PsEndpoint {
  status?: EndpointStatus;
  auth?: PsAuth;
  aor?: PsAor;
}

// ============================================
// QUEUE
// ============================================

export interface Queue {
  name: string;
  tenantId: number;
  strategy: QueueStrategy;
  timeout?: number;
  maxlen?: number;
  announce?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateQueueRequest {
  name: string;
  tenantId: number;
  strategy: QueueStrategy;
  timeout?: number;
  maxlen?: number;
  announce?: string;
}

export interface QueueStats {
  name: string;
  calls: number;
  completed: number;
  abandoned: number;
  holdTime: number;
  talkTime: number;
  serviceLevel: number;
  members: number;
  available: number;
}

export interface EnrichedQueue extends Queue {
  stats?: QueueStats;
}

// ============================================
// QUEUE MEMBER
// ============================================

export interface QueueMember {
  queueName: string;
  interface: string;
  memberName: string;
  stateInterface?: string;
  penalty: number;
  paused: boolean;
  wrapuptime?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateQueueMemberRequest {
  interface: string;
  memberName?: string;
  penalty?: number;
  paused?: boolean;
}

export interface EnrichedQueueMember extends QueueMember {
  endpoint?: PsEndpoint;
  status?: string;
  callsTaken?: number;
  lastCall?: number;
}

// ============================================
// CHANNEL
// ============================================

export interface Channel {
  id: string;
  name: string;
  state: ChannelState;
  caller: {
    name: string;
    number: string;
  };
  connected: {
    name: string;
    number: string;
  };
  accountcode: string;
  dialplan: {
    context: string;
    exten: string;
    priority: number;
  };
  createdAt: string;
}

export interface OriginateRequest {
  endpoint: string;
  extension: string;
  context?: string;
  callerId?: string;
}

// ============================================
// CDR
// ============================================

export interface Cdr {
  id: number;
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
  disposition: string;
  amaflags: string;
  accountcode: string;
  uniqueid: string;
  userfield: string;
}

export interface CdrStats {
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  averageDuration: number;
  totalDuration: number;
}

// ============================================
// RECORDING
// ============================================

export interface Recording {
  id: number;
  name: string;
  filePath: string;
  format: string;
  duration?: number;
  size?: number;
  tenantId: number;
  createdAt: string;
  deletedAt?: string;
}

export interface StartRecordingRequest {
  channelId: string;
  name: string;
  format?: 'wav' | 'gsm' | 'mp3';
}

// ============================================
// EXTENSION
// ============================================

export interface Extension {
  id: number;
  context: string;
  exten: string;
  priority: number;
  app: string;
  appdata: string;
  tenantId: number;
}

export interface CreateExtensionRequest {
  context: string;
  exten: string;
  priority: number;
  app: string;
  appdata: string;
  tenantId: number;
}

export interface DialplanTemplate {
  type: 'internal' | 'external' | 'queue' | 'ivr' | 'voicemail' | 'conference';
  pattern: string;
  queueName?: string;
  menuId?: number;
  trunkName?: string;
}

// ============================================
// IVR
// ============================================

export interface IvrMenu {
  id: number;
  tenantId: number;
  name: string;
  description?: string;
  welcomeSound: string;
  invalidSound?: string;
  timeoutSound?: string;
  maxRetries: number;
  timeout: number;
  contextFilter?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateIvrMenuRequest {
  tenantId: number;
  name: string;
  description?: string;
  welcomeSound: string;
  invalidSound?: string;
  timeoutSound?: string;
  maxRetries?: number;
  timeout?: number;
  contextFilter?: string[];
}

export interface IvrOption {
  id: number;
  menuId: number;
  digit: string;
  actionType: IvrActionType;
  actionData: Record<string, any>;
  description?: string;
  order: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateIvrOptionRequest {
  menuId: number;
  digit: string;
  actionType: IvrActionType;
  actionData: Record<string, any>;
  description?: string;
  order?: number;
}

export interface IvrCondition {
  id: number;
  menuId: number;
  conditionType: IvrConditionType;
  conditionData: Record<string, any>;
  targetMenuId?: number;
  isActive: boolean;
  priority: number;
}

export interface CreateIvrConditionRequest {
  menuId: number;
  conditionType: IvrConditionType;
  conditionData: Record<string, any>;
  targetMenuId?: number;
  priority?: number;
}

export interface IvrDidMapping {
  id: number;
  tenantId: number;
  did: string;
  menuId: number;
  contextFilter?: string[];
  isActive: boolean;
  createdAt: string;
}

export interface CreateIvrDidMappingRequest {
  tenantId: number;
  did: string;
  menuId: number;
  contextFilter?: string[];
}

export interface IvrAudioFile {
  id: number;
  tenantId: number;
  name: string;
  filePath: string;
  format: string;
  duration?: number;
  size?: number;
  createdAt: string;
}

// ============================================
// STATISTICS
// ============================================

export interface DashboardStats {
  tenants: {
    total: number;
    active: number;
  };
  endpoints: {
    total: number;
    online: number;
    offline: number;
  };
  queues: {
    total: number;
    activeCalls: number;
  };
  calls: {
    today: number;
    answered: number;
    missed: number;
    averageDuration: number;
  };
  channels: {
    active: number;
  };
}

export interface StatsSummary {
  period: string;
  calls: {
    total: number;
    answered: number;
    missed: number;
    averageDuration: number;
  };
  queues: {
    totalCalls: number;
    abandoned: number;
    averageWaitTime: number;
  };
  endpoints: {
    total: number;
    activeNow: number;
  };
}

export interface TrendData {
  date: string;
  calls: number;
  answered: number;
  missed: number;
  duration: number;
}

// ============================================
// MONITORING
// ============================================

export interface MonitoringEvent {
  id: string;
  type: string;
  timestamp: string;
  data: Record<string, any>;
}

export interface MonitoringDashboard {
  activeChannels: Channel[];
  recentEvents: MonitoringEvent[];
  systemStatus: {
    asteriskUptime: number;
    callsActive: number;
    queueCalls: number;
  };
}

// ============================================
// PAGINATION
// ============================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ============================================
// API RESPONSE
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
}
