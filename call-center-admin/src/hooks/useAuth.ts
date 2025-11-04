/**
 * Auth Hook - Typed Redux hooks
 */

import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { UserRole } from '../types/entities.types';

export const useAuth = () => {
  const { user, token, isAuthenticated, role, tenantId } = useSelector(
    (state: RootState) => state.auth
  );

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!role) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(role);
  };

  const isSuperAdmin = (): boolean => {
    return role === UserRole.SUPER_ADMIN;
  };

  const isTenantAdmin = (): boolean => {
    return role === UserRole.TENANT_ADMIN || role === UserRole.SUPER_ADMIN;
  };

  const isSupervisor = (): boolean => {
    return (
      role === UserRole.SUPERVISOR ||
      role === UserRole.TENANT_ADMIN ||
      role === UserRole.SUPER_ADMIN
    );
  };

  return {
    user,
    token,
    isAuthenticated,
    role,
    tenantId,
    hasRole,
    isSuperAdmin,
    isTenantAdmin,
    isSupervisor,
  };
};
