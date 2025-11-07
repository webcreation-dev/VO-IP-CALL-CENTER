/**
 * Types for the Roles and Permissions System
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Hierarchical levels (1-10)
 * 1 = Lowest (Agent)
 * 10 = Highest (Director)
 */
export enum RoleLevel {
  AGENT = 1,
  TEAM_LEADER = 3,
  SUPERVISOR = 5,
  MANAGER = 8,
  DIRECTOR = 10,
}

/**
 * Audit log actions
 */
export enum AuditAction {
  ALLOWED = 'allowed',
  DENIED = 'denied',
}

/**
 * Denial reasons
 */
export enum DenyReason {
  ENDPOINT_NOT_FOUND = 'endpoint_not_found',
  INTER_CONTEXT_DENIED = 'inter_context_denied',
  ROLE_PERMISSION_DENIED = 'role_permission_denied',
}

// ============================================================================
// Entities
// ============================================================================

/**
 * Endpoint Role Entity
 */
export interface EndpointRole {
  id: number;
  tenantId: number;
  name: string;
  displayName: string;
  description: string | null;
  level: number;
  canCallSameLevel: boolean;
  canCallLowerLevel: boolean;
  canCallHigherLevel: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Call Audit Log Entity
 */
export interface CallAuditLog {
  id: number;
  tenantId: number;
  callerEndpointId: string;
  callerRoleId: number | null;
  calledEndpointId: string;
  calledRoleId: number | null;
  callerContext: string;
  calledContext: string;
  action: AuditAction;
  denyReason: DenyReason | null;
  channelId: string | null;
  uniqueid: string | null;
  callerNumber: string | null;
  calledNumber: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
}

/**
 * Role Preset (from JSON files)
 */
export interface RolePreset {
  id: string;
  name: string;
  description: string;
  roles: RolePresetRole[];
}

/**
 * Role definition within a preset
 */
export interface RolePresetRole {
  name: string;
  displayName: string;
  description: string;
  level: number;
  canCallSameLevel: boolean;
  canCallLowerLevel: boolean;
  canCallHigherLevel: boolean;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * Create Role Request
 */
export interface CreateRoleDto {
  tenantId?: number;
  name: string;
  displayName: string;
  description?: string;
  level: number;
  canCallSameLevel?: boolean;
  canCallLowerLevel?: boolean;
  canCallHigherLevel?: boolean;
  isActive?: boolean;
}

/**
 * Update Role Request
 */
export interface UpdateRoleDto {
  displayName?: string;
  description?: string;
  canCallSameLevel?: boolean;
  canCallLowerLevel?: boolean;
  canCallHigherLevel?: boolean;
  isActive?: boolean;
}

/**
 * Apply Preset Request
 */
export interface ApplyPresetDto {
  presetId: string;
}

/**
 * Audit Log Filters
 */
export interface AuditLogFilters {
  startDate?: string;
  endDate?: string;
  action?: AuditAction;
  callerEndpointId?: string;
  calledEndpointId?: string;
  callerRoleId?: number;
  calledRoleId?: number;
  callerContext?: string;
  calledContext?: string;
  denyReason?: DenyReason;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Role Statistics Response
 */
export interface RoleStatistics {
  totalRoles: number;
  activeRoles: number;
  inactiveRoles: number;
  endpointsByRole: Array<{
    roleId: number;
    roleName: string;
    count: number;
  }>;
  levels: Array<{
    level: number;
    count: number;
  }>;
}

/**
 * Callable Roles Response
 */
export interface CallableRolesResponse {
  role: EndpointRole;
  callableRoles: EndpointRole[];
}

/**
 * Audit Log Statistics
 */
export interface AuditLogStatistics {
  total: number;
  allowed: number;
  denied: number;
  byDenyReason: Array<{
    reason: DenyReason;
    count: number;
  }>;
  byContext: Array<{
    context: string;
    allowed: number;
    denied: number;
  }>;
  byRole: Array<{
    roleId: number;
    roleName: string;
    allowed: number;
    denied: number;
  }>;
  timeline: Array<{
    date: string;
    allowed: number;
    denied: number;
  }>;
}

// ============================================================================
// UI Helper Types
// ============================================================================

/**
 * Role with additional UI metadata
 */
export interface RoleWithMeta extends EndpointRole {
  endpointCount?: number;
  color?: string;
  icon?: string;
}

/**
 * Permission summary for UI display
 */
export interface PermissionSummary {
  sameLevel: boolean;
  lowerLevel: boolean;
  higherLevel: boolean;
  description: string;
}

/**
 * Role hierarchy node for tree visualization
 */
export interface RoleHierarchyNode {
  role: EndpointRole;
  children: RoleHierarchyNode[];
  canCallDirectly: boolean;
}

/**
 * Call permission matrix cell
 */
export interface PermissionMatrixCell {
  from: EndpointRole;
  to: EndpointRole;
  allowed: boolean;
  reason?: string;
}

// ============================================================================
// Form Types
// ============================================================================

/**
 * Role Form Values (for React Hook Form or similar)
 */
export interface RoleFormValues {
  name: string;
  displayName: string;
  description: string;
  level: number;
  canCallSameLevel: boolean;
  canCallLowerLevel: boolean;
  canCallHigherLevel: boolean;
  isActive: boolean;
}

/**
 * Preset selection state
 */
export interface PresetSelectionState {
  selectedPresetId: string | null;
  previewRoles: RolePresetRole[];
  isApplying: boolean;
}
