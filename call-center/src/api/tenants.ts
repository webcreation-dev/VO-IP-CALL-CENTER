import apiClient, { type ApiResponse } from './config';

// Dialplan Configuration Interface
export interface DialplanConfig {
  internalDialPattern?: string;      // e.g., "_1XXX" (1000-1999)
  internalDialTimeout?: number;      // default: 20 seconds
  queuePattern?: string;             // e.g., "_5XXX" (5000-5999)
  voicemailPattern?: string;         // e.g., "*XXX"
  testExtension?: string;            // e.g., "999"
  allowExternal?: boolean;           // default: false
  externalPattern?: string;          // e.g., "_0XXXXXXXXX"
  externalPrefix?: string;           // e.g., "9"
}

// Tenant Interface
export interface Tenant {
  id: number;
  name: string;
  companyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone: string;
  isActive: boolean;
  maxEndpoints: number;
  maxQueues: number;
  context?: string;
  dialplanConfig?: DialplanConfig;
  createdAt: string;
  updatedAt: string;
}

// Create Tenant DTO
export interface CreateTenantDto {
  name: string;                     // Required, 3-255 chars, unique
  companyName?: string;             // Optional, max 255 chars
  contactEmail?: string;            // Optional, email format
  contactPhone?: string;            // Optional, max 50 chars
  address?: string;                 // Optional
  city?: string;                    // Optional, max 100 chars
  country?: string;                 // Optional, max 100 chars
  timezone?: string;                // Optional, max 50 chars, default: 'UTC'
  maxEndpoints?: number;            // Optional, 1-10000, default: 100
  maxQueues?: number;               // Optional, 1-1000, default: 50
  context?: string;                 // Optional, max 40 chars, pattern: ^[a-z0-9_-]+$
  dialplanConfig?: DialplanConfig;  // Optional
}

// Update Tenant DTO
export interface UpdateTenantDto {
  name?: string;                    // Optional, max 255 chars
  companyName?: string;             // Optional, max 255 chars
  contactEmail?: string;            // Optional, email format
  contactPhone?: string;            // Optional, max 50 chars
  address?: string;                 // Optional
  city?: string;                    // Optional, max 100 chars
  country?: string;                 // Optional, max 100 chars
  timezone?: string;                // Optional, max 50 chars
  maxEndpoints?: number;            // Optional, 1-10000
  maxQueues?: number;               // Optional, 1-1000
  context?: string;                 // Optional, max 40 chars, pattern: ^[a-z0-9_-]+$
  isActive?: boolean;               // Optional
  dialplanConfig?: DialplanConfig;  // Optional
}

// Tenant Filter DTO
export interface TenantFilterDto {
  search?: string;                  // Text search (name, companyName, contactEmail)
  isActive?: boolean;               // Filter by active status
  minMaxEndpoints?: number;         // Filter by minimum endpoint limit
  maxMaxEndpoints?: number;         // Filter by maximum endpoint limit
  minMaxQueues?: number;            // Filter by minimum queue limit
  maxMaxQueues?: number;            // Filter by maximum queue limit
  createdAfter?: string;            // Date filter (ISO format)
  createdBefore?: string;           // Date filter (ISO format)
  page?: number;                    // Page number (default: 1)
  limit?: number;                   // Items per page (1-100, default: 20)
  sortBy?: string;                  // Sort field
  order?: 'ASC' | 'DESC';           // Sort order (default: DESC)
}

// Default Dialplan Configuration
export const DEFAULT_DIALPLAN_CONFIG: DialplanConfig = {
  internalDialPattern: '_1XXX',
  internalDialTimeout: 20,
  queuePattern: '_5XXX',
  voicemailPattern: '*XXX',
  testExtension: '999',
  allowExternal: false,
};

// Common Timezones for Select
export const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (CST)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEDT/AEST)' },
];

class TenantsService {
  // Get all tenants with optional filters
  async getAll(filters?: TenantFilterDto): Promise<Tenant[]> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.search) params.append('search', filters.search);
      if (filters.isActive !== undefined) params.append('isActive', String(filters.isActive));
      if (filters.minMaxEndpoints) params.append('minMaxEndpoints', String(filters.minMaxEndpoints));
      if (filters.maxMaxEndpoints) params.append('maxMaxEndpoints', String(filters.maxMaxEndpoints));
      if (filters.minMaxQueues) params.append('minMaxQueues', String(filters.minMaxQueues));
      if (filters.maxMaxQueues) params.append('maxMaxQueues', String(filters.maxMaxQueues));
      if (filters.createdAfter) params.append('createdAfter', filters.createdAfter);
      if (filters.createdBefore) params.append('createdBefore', filters.createdBefore);
      // Backend pagination is 0-based, so subtract 1 from frontend page number
      if (filters.page) params.append('page', String(filters.page - 1));
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.order) params.append('order', filters.order);
    }

    const queryString = params.toString();
    const url = `/tenants${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get<ApiResponse<Tenant[]>>(url);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch tenants');
  }

  // Get tenant by ID
  async getById(id: number): Promise<Tenant> {
    const response = await apiClient.get<ApiResponse<Tenant>>(`/tenants/${id}`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to fetch tenant ${id}`);
  }

  // Get current user's tenant
  async getMyTenant(): Promise<Tenant> {
    const response = await apiClient.get<ApiResponse<Tenant>>('/tenants/me');

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch current tenant');
  }

  // Create new tenant
  async create(data: CreateTenantDto): Promise<Tenant> {
    const response = await apiClient.post<ApiResponse<Tenant>>('/tenants', data);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to create tenant');
  }

  // Update tenant
  async update(id: number, data: UpdateTenantDto): Promise<Tenant> {
    const response = await apiClient.patch<ApiResponse<Tenant>>(`/tenants/${id}`, data);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to update tenant ${id}`);
  }

  // Delete tenant (soft delete)
  async delete(id: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/tenants/${id}`);

    if (!response.data.success) {
      throw new Error(`Failed to delete tenant ${id}`);
    }
  }

  // Restore deleted tenant
  async restore(id: number): Promise<Tenant> {
    const response = await apiClient.patch<ApiResponse<Tenant>>(`/tenants/${id}/restore`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to restore tenant ${id}`);
  }

  // Generate context name from tenant name
  generateContextName(tenantName: string): string {
    return tenantName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]/g, '_')      // Replace non-alphanumeric with underscore
      .replace(/_+/g, '_')              // Replace multiple underscores with single
      .replace(/^_|_$/g, '')            // Remove leading/trailing underscores
      .substring(0, 40);                // Max 40 chars (Asterisk limitation)
  }

  // Get status badge variant
  getStatusBadgeVariant(isActive: boolean): 'success' | 'gray' {
    return isActive ? 'success' : 'gray';
  }

  // Get status label
  getStatusLabel(isActive: boolean): string {
    return isActive ? 'Actif' : 'Inactif';
  }
}

export default new TenantsService();
