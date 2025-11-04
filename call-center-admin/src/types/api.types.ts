/**
 * API Request/Response Types
 */

import { User, UserRole } from './entities.types';

// Auth
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    tenantId: number | null;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId?: number;
}

// Tenants
export interface CreateTenantRequest {
  name: string;
  companyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string;
  maxEndpoints?: number;
  maxQueues?: number;
}

export interface UpdateTenantRequest extends Partial<CreateTenantRequest> {}

// Endpoints
export interface CreateEndpointRequest {
  username: string;
  password: string;
  transport?: string;
  context?: string;
  allow?: string;
  callerid?: string;
  tenantId?: number;
}

export interface UpdateEndpointRequest extends Partial<Omit<CreateEndpointRequest, 'username'>> {}

// Queues
export interface CreateQueueRequest {
  name: string;
  strategy: string;
  timeout?: number;
  maxlen?: number;
  weight?: number;
  announce?: string;
}

export interface UpdateQueueRequest extends Partial<Omit<CreateQueueRequest, 'name'>> {}

// Queue Members
export interface AddMemberRequest {
  memberName: string;
  interface?: string;
  penalty?: number;
  paused?: boolean;
}

export interface UpdateMemberRequest {
  penalty?: number;
}

// Channels
export interface OriginateCallRequest {
  endpoint: string;
  extension: string;
  context?: string;
  timeout?: number;
  callerIdName?: string;
  callerIdNumber?: string;
  variables?: Record<string, string>;
}

// Filters
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EndpointFilter extends PaginationParams {
  search?: string;
  status?: string;
}

export interface QueueFilter extends PaginationParams {
  search?: string;
}

export interface CDRFilter extends PaginationParams {
  startDate?: string;
  endDate?: string;
  src?: string;
  dst?: string;
  disposition?: string;
}

export interface ChannelFilter {
  state?: string;
  callerId?: string;
}

// Generic API Response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  statusCode?: number;
  timestamp?: string;
  path?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
