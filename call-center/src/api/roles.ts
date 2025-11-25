import apiClient from './config';
import type {
  EndpointRole,
  CreateRoleDto,
  UpdateRoleDto,
  RolePreset,
  RoleStatistics,
  CallableRolesResponse,
  CallAuditLog,
  AuditLogFilters,
  AuditLogStatistics,
} from '../types/roles';

/**
 * Roles API Service
 *
 * Provides methods to interact with the roles and permissions backend API.
 */
class RolesService {
  private readonly basePath = '/roles';

  /**
   * Get all roles for the current tenant
   * @param activeOnly - Filter only active roles
   * @param tenantId - Optional tenant ID (for ADMIN users)
   * @param contextId - Optional context ID (undefined = all, null = tenant-wide only, number = context-specific + tenant-wide)
   */
  async getRoles(activeOnly = false, tenantId?: number, contextId?: number | null): Promise<EndpointRole[]> {
    const response = await apiClient.get<any>(this.basePath, {
      params: {
        activeOnly,
        ...(tenantId !== undefined && { tenantId }), // Add tenantId to params if provided
        ...(contextId !== undefined && { contextId: contextId === null ? 'null' : contextId }) // Add contextId if provided
      },
    });
    // Handle both direct array and wrapped response { data: [] }
    return Array.isArray(response.data) ? response.data : (response.data?.data || []);
  }

  /**
   * Get a specific role by ID
   */
  async getRole(id: number): Promise<EndpointRole> {
    const response = await apiClient.get<EndpointRole>(`${this.basePath}/${id}`);
    return response.data;
  }

  /**
   * Create a new role
   */
  async createRole(data: CreateRoleDto): Promise<EndpointRole> {
    const response = await apiClient.post<EndpointRole>(this.basePath, data);
    return response.data;
  }

  /**
   * Update an existing role
   */
  async updateRole(id: number, data: UpdateRoleDto): Promise<EndpointRole> {
    const response = await apiClient.patch<EndpointRole>(
      `${this.basePath}/${id}`,
      data,
    );
    return response.data;
  }

  /**
   * Delete a role
   */
  async deleteRole(id: number): Promise<void> {
    await apiClient.delete(`${this.basePath}/${id}`);
  }

  /**
   * Get roles that a specific role can call
   */
  async getCallableRoles(roleId: number): Promise<CallableRolesResponse> {
    const response = await apiClient.get<CallableRolesResponse>(
      `${this.basePath}/${roleId}/callable-roles`,
    );
    return response.data;
  }

  /**
   * Get role statistics for the tenant
   */
  async getRoleStatistics(): Promise<RoleStatistics> {
    const response = await apiClient.get<RoleStatistics>(
      `${this.basePath}/statistics`,
    );
    return response.data;
  }

  /**
   * Get all available role presets
   */
  async getPresets(): Promise<RolePreset[]> {
    const response = await apiClient.get<RolePreset[]>(
      `${this.basePath}/presets`,
    );
    return response.data;
  }

  /**
   * Get a specific preset by ID
   */
  async getPreset(presetId: string): Promise<RolePreset> {
    const response = await apiClient.get<RolePreset>(
      `${this.basePath}/presets/${presetId}`,
    );
    return response.data;
  }

  /**
   * Apply a preset to the current tenant
   */
  async applyPreset(presetId: string): Promise<EndpointRole[]> {
    const response = await apiClient.post<EndpointRole[]>(
      `${this.basePath}/presets/${presetId}/apply`,
    );
    return response.data;
  }

  // ============================================================================
  // Audit Logs
  // ============================================================================

  /**
   * Get audit logs with optional filters
   */
  async getAuditLogs(filters?: AuditLogFilters): Promise<CallAuditLog[]> {
    const response = await apiClient.get<CallAuditLog[]>('/audit-logs', {
      params: filters,
    });
    return response.data;
  }

  /**
   * Get audit log statistics
   */
  async getAuditLogStatistics(
    filters?: AuditLogFilters,
  ): Promise<AuditLogStatistics> {
    const response = await apiClient.get<AuditLogStatistics>(
      '/audit-logs/statistics',
      {
        params: filters,
      },
    );
    return response.data;
  }

  /**
   * Get a specific audit log by ID
   */
  async getAuditLog(id: number): Promise<CallAuditLog> {
    const response = await apiClient.get<CallAuditLog>(`/audit-logs/${id}`);
    return response.data;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Get role color based on level (for UI display)
   */
  getRoleColor(level: number): string {
    if (level >= 9) return 'purple';
    if (level >= 7) return 'blue';
    if (level >= 5) return 'indigo';
    if (level >= 3) return 'green';
    return 'gray';
  }

  /**
   * Get role icon based on level
   */
  getRoleIcon(level: number): string {
    if (level >= 9) return '👑'; // Director
    if (level >= 7) return '🎖️'; // Manager
    if (level >= 5) return '👔'; // Supervisor
    if (level >= 3) return '📋'; // Team Leader
    return '👤'; // Agent
  }

  /**
   * Get human-readable permission summary
   */
  getPermissionSummary(role: EndpointRole): string {
    const permissions: string[] = [];

    if (role.canCallSameLevel) permissions.push('Même niveau');
    if (role.canCallLowerLevel) permissions.push('Niveaux inférieurs');
    if (role.canCallHigherLevel) permissions.push('Niveaux supérieurs');

    if (permissions.length === 0) return 'Aucune permission';
    if (permissions.length === 3) return 'Tous les niveaux';

    return permissions.join(' + ');
  }

  /**
   * Check if a role can call another role (client-side validation)
   */
  canCall(fromRole: EndpointRole, toRole: EndpointRole): boolean {
    if (fromRole.level === toRole.level) {
      return fromRole.canCallSameLevel;
    }

    if (fromRole.level > toRole.level) {
      return fromRole.canCallLowerLevel;
    }

    return fromRole.canCallHigherLevel;
  }

  /**
   * Get deny reason message (user-friendly)
   */
  getDenyReasonMessage(reason: string): string {
    const messages: Record<string, string> = {
      endpoint_not_found: "L'endpoint n'existe pas",
      inter_context_denied: 'Appels inter-contextes non autorisés',
      role_permission_denied: "Permissions de rôle insuffisantes",
    };

    return messages[reason] || 'Raison inconnue';
  }

  /**
   * Format audit log for display
   */
  formatAuditLogDisplay(log: CallAuditLog): string {
    const action = log.action === 'allowed' ? '✅' : '❌';
    const time = new Date(log.createdAt).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `${action} ${time} - ${log.callerEndpointId} → ${log.calledEndpointId}`;
  }
}

// Export singleton instance
export const rolesService = new RolesService();
export default rolesService;
