import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import rolesService from '../api/roles';
import type {
  EndpointRole,
  CreateRoleDto,
  UpdateRoleDto,
  RoleStatistics,
  CallableRolesResponse,
} from '../types/roles';

// Query Keys
export const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  list: (filters: { activeOnly?: boolean }) => [...roleKeys.lists(), filters] as const,
  details: () => [...roleKeys.all, 'detail'] as const,
  detail: (id: number) => [...roleKeys.details(), id] as const,
  statistics: () => [...roleKeys.all, 'statistics'] as const,
  callable: (roleId: number) => [...roleKeys.all, 'callable', roleId] as const,
  presets: () => ['presets'] as const,
};

/**
 * Hook to fetch all roles
 */
export function useRoles(activeOnly = false) {
  return useQuery({
    queryKey: roleKeys.list({ activeOnly }),
    queryFn: () => rolesService.getRoles(activeOnly),
  });
}

/**
 * Hook to fetch a single role
 */
export function useRole(id: number) {
  return useQuery({
    queryKey: roleKeys.detail(id),
    queryFn: () => rolesService.getRole(id),
    enabled: !!id,
  });
}

/**
 * Hook to fetch role statistics
 */
export function useRoleStatistics() {
  return useQuery({
    queryKey: roleKeys.statistics(),
    queryFn: () => rolesService.getRoleStatistics(),
  });
}

/**
 * Hook to fetch callable roles for a specific role
 */
export function useCallableRoles(roleId: number) {
  return useQuery({
    queryKey: roleKeys.callable(roleId),
    queryFn: () => rolesService.getCallableRoles(roleId),
    enabled: !!roleId,
  });
}

/**
 * Hook to fetch role presets
 */
export function useRolePresets() {
  return useQuery({
    queryKey: roleKeys.presets(),
    queryFn: () => rolesService.getPresets(),
  });
}

/**
 * Hook to create a new role
 */
export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRoleDto) => rolesService.createRole(data),
    onSuccess: () => {
      // Invalidate and refetch roles
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: roleKeys.statistics() });
    },
  });
}

/**
 * Hook to update a role
 */
export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateRoleDto }) =>
      rolesService.updateRole(id, data),
    onSuccess: (_, variables) => {
      // Invalidate specific role and lists
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: roleKeys.statistics() });
    },
  });
}

/**
 * Hook to delete a role
 */
export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => rolesService.deleteRole(id),
    onSuccess: () => {
      // Invalidate lists and statistics
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: roleKeys.statistics() });
    },
  });
}

/**
 * Hook to apply a preset
 */
export function useApplyPreset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (presetId: string) => rolesService.applyPreset(presetId),
    onSuccess: () => {
      // Invalidate all role-related queries
      queryClient.invalidateQueries({ queryKey: roleKeys.all });
    },
  });
}
