/**
 * Application Constants
 */

export const APP_NAME = 'Call Center Admin';
export const APP_VERSION = '1.0.0';

// API
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  USER: 'user',
  THEME: 'theme',
} as const;

// User Roles
export const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  TENANT_ADMIN: 'TENANT_ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  AGENT: 'AGENT',
  ADMIN: 'ADMIN',
} as const;

// Role Labels
export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Administrator',
  TENANT_ADMIN: 'Tenant Administrator',
  SUPERVISOR: 'Supervisor',
  AGENT: 'Agent',
  ADMIN: 'Administrator',
};

// Queue Strategies
export const QUEUE_STRATEGIES = [
  { value: 'ringall', label: 'Ring All' },
  { value: 'leastrecent', label: 'Least Recent' },
  { value: 'fewestcalls', label: 'Fewest Calls' },
  { value: 'random', label: 'Random' },
  { value: 'rrmemory', label: 'Round Robin Memory' },
  { value: 'linear', label: 'Linear' },
  { value: 'wrandom', label: 'Weighted Random' },
];

// Endpoint Status Colors
export const STATUS_COLORS: Record<string, string> = {
  online: 'text-green-600 bg-green-100',
  offline: 'text-red-600 bg-red-100',
  unknown: 'text-gray-600 bg-gray-100',
  busy: 'text-yellow-600 bg-yellow-100',
  ringing: 'text-blue-600 bg-blue-100',
  paused: 'text-orange-600 bg-orange-100',
};

// CDR Dispositions
export const CDR_DISPOSITIONS = [
  { value: 'ANSWERED', label: 'Answered' },
  { value: 'NO ANSWER', label: 'No Answer' },
  { value: 'BUSY', label: 'Busy' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CONGESTION', label: 'Congestion' },
];

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Auto-refresh intervals (milliseconds)
export const REFRESH_INTERVALS = {
  DASHBOARD: 10000,      // 10 seconds
  ENDPOINTS: 10000,      // 10 seconds
  QUEUES: 5000,          // 5 seconds
  CHANNELS: 3000,        // 3 seconds
  QUEUE_MEMBERS: 5000,   // 5 seconds
};
