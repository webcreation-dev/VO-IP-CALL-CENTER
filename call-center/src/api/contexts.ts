import apiClient, { type ApiResponse } from './config';

// Dialplan Configuration Interface
export interface DialplanConfig {
  allowInbound?: boolean;       // Allow incoming calls to this context
  allowOutbound?: boolean;      // Allow outgoing calls from this context
  allowInternal?: boolean;      // Allow internal calls within context
  allowInterContext?: boolean;  // Allow calls between contexts
  allowedContexts?: string[];   // List of allowed contexts for inter-context calls
}

// Tenant Context Interface
export interface TenantContext {
  id: number;
  tenantId: number;
  name: string;              // Format: t{tenantId}_{name}
  description?: string;
  isPrimary: boolean;
  dialplanConfig?: DialplanConfig;
  createdAt: string;
  updatedAt: string;
}

// Create Context DTO
export interface CreateContextDto {
  name: string;                     // Required, will be prefixed with t{tenantId}_
  description?: string;             // Optional description
  dialplanConfig?: DialplanConfig;  // Optional dialplan configuration
}

// Update Context DTO
export interface UpdateContextDto {
  description?: string;             // Optional description update
  dialplanConfig?: DialplanConfig;  // Optional dialplan configuration update
}

// Default Dialplan Configuration
export const DEFAULT_DIALPLAN_CONFIG: DialplanConfig = {
  allowInbound: true,
  allowOutbound: true,
  allowInternal: true,
  allowInterContext: false,
};

class ContextsService {
  // Get all contexts for current tenant
  async getAll(): Promise<TenantContext[]> {
    const response = await apiClient.get<ApiResponse<TenantContext[]>>('/contexts');

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch contexts');
  }

  // Get contexts for a specific tenant (SUPER_ADMIN only)
  async getByTenant(tenantId: number): Promise<TenantContext[]> {
    const response = await apiClient.get<ApiResponse<TenantContext[]>>(
      `/tenants/${tenantId}/contexts`
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to fetch contexts for tenant ${tenantId}`);
  }

  // Get context by ID
  async getById(id: number): Promise<TenantContext> {
    const response = await apiClient.get<ApiResponse<TenantContext>>(`/contexts/${id}`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to fetch context ${id}`);
  }

  // Create new context
  async create(data: CreateContextDto): Promise<TenantContext> {
    const response = await apiClient.post<ApiResponse<TenantContext>>('/contexts', data);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to create context');
  }

  // Update context
  async update(id: number, data: UpdateContextDto): Promise<TenantContext> {
    const response = await apiClient.patch<ApiResponse<TenantContext>>(
      `/contexts/${id}`,
      data
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to update context ${id}`);
  }

  // Delete context (cannot delete primary context)
  async delete(id: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/contexts/${id}`);

    if (!response.data.success) {
      throw new Error(`Failed to delete context ${id}`);
    }
  }

  // Get display name (remove tenant prefix)
  getDisplayName(context: TenantContext): string {
    // Extract name after "t{tenantId}_" prefix
    const match = context.name.match(/^t\d+_(.+)$/);
    return match ? match[1] : context.name;
  }

  // Check if context can be deleted (not primary)
  canDelete(context: TenantContext): boolean {
    return !context.isPrimary;
  }

  // Check if context can be edited (name cannot be edited)
  canEdit(context: TenantContext): boolean {
    // Description and dialplanConfig can always be edited
    // Name cannot be edited after creation
    return true;
  }

  // Get badge variant for primary context
  getPrimaryBadgeVariant(isPrimary: boolean): 'default' | 'outline' {
    return isPrimary ? 'default' : 'outline';
  }

  // Get primary label
  getPrimaryLabel(isPrimary: boolean): string {
    return isPrimary ? 'Contexte Principal' : 'Contexte Secondaire';
  }

  // Generate context preview name for form
  generateContextPreview(tenantId: number, name: string): string {
    if (!name) return `t${tenantId}_`;

    // Normalize name (lowercase, alphanumeric + underscores only)
    const normalized = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]/g, '_')      // Replace non-alphanumeric with underscore
      .replace(/_+/g, '_')              // Replace multiple underscores with single
      .replace(/^_|_$/g, '');           // Remove leading/trailing underscores

    return `t${tenantId}_${normalized}`;
  }

  // Get dialplan config summary for display
  getDialplanSummary(config?: DialplanConfig): string {
    if (!config) return 'Configuration par défaut';

    const features: string[] = [];
    if (config.allowInbound) features.push('Entrant');
    if (config.allowOutbound) features.push('Sortant');
    if (config.allowInternal) features.push('Interne');

    // Add inter-context with count if enabled
    if (config.allowInterContext) {
      const contextCount = config.allowedContexts?.length || 0;
      if (contextCount > 0) {
        features.push(`Inter-contexte (${contextCount})`);
      } else {
        features.push('Inter-contexte');
      }
    }

    return features.length > 0 ? features.join(', ') : 'Aucune permission';
  }
}

export default new ContextsService();
