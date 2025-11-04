/**
 * Tenants API
 */

import apiClient from './client';
import { Tenant } from '../types/entities.types';
import { CreateTenantRequest, UpdateTenantRequest } from '../types/api.types';

export const tenantsApi = {
  /**
   * Get all tenants
   */
  getAll: async (includeInactive?: boolean): Promise<Tenant[]> => {
    const response = await apiClient.get<Tenant[]>('/tenants', {
      params: { includeInactive },
    });
    return response.data;
  },

  /**
   * Get tenant by ID
   */
  getById: async (id: number): Promise<Tenant> => {
    const response = await apiClient.get<Tenant>(`/tenants/${id}`);
    return response.data;
  },

  /**
   * Get my tenant (current user's tenant)
   */
  getMy: async (): Promise<Tenant> => {
    const response = await apiClient.get<Tenant>('/tenants/me');
    return response.data;
  },

  /**
   * Create tenant (SUPER_ADMIN only)
   */
  create: async (data: CreateTenantRequest): Promise<Tenant> => {
    const response = await apiClient.post<Tenant>('/tenants', data);
    return response.data;
  },

  /**
   * Update tenant
   */
  update: async (id: number, data: UpdateTenantRequest): Promise<Tenant> => {
    const response = await apiClient.patch<Tenant>(`/tenants/${id}`, data);
    return response.data;
  },

  /**
   * Delete tenant (soft delete)
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/tenants/${id}`);
  },

  /**
   * Restore deleted tenant
   */
  restore: async (id: number): Promise<Tenant> => {
    const response = await apiClient.patch<Tenant>(`/tenants/${id}/restore`);
    return response.data;
  },
};
