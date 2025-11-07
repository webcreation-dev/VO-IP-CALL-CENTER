import React from 'react';
import rolesService from '../../api/roles';
import type { EndpointRole } from '../../types/roles';

interface RoleBadgeProps {
  role?: EndpointRole | null;
  size?: 'sm' | 'md' | 'lg';
  showLevel?: boolean;
  showTooltip?: boolean;
  className?: string;
}

/**
 * Badge component to display role information
 *
 * Features:
 * - Color-coded by hierarchical level
 * - Optional icon based on level
 * - Tooltip with permissions on hover
 * - Multiple sizes
 */
export function RoleBadge({
  role,
  size = 'md',
  showLevel = true,
  showTooltip = true,
  className = '',
}: RoleBadgeProps) {
  if (!role) {
    return (
      <span className={`inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600 ${className}`}>
        Aucun rôle
      </span>
    );
  }

  const color = rolesService.getRoleColor(role.level);
  const icon = rolesService.getRoleIcon(role.level);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const colorClasses = {
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const badgeClasses = `
    inline-flex items-center gap-1 rounded-full border font-medium
    ${sizeClasses[size]}
    ${colorClasses[color as keyof typeof colorClasses] || colorClasses.gray}
    ${className}
  `.trim();

  const permissionsSummary = rolesService.getPermissionSummary(role);

  const badge = (
    <span className={badgeClasses}>
      <span className="flex-shrink-0">{icon}</span>
      <span className="truncate">{role.displayName}</span>
      {showLevel && (
        <span className="ml-1 font-bold opacity-60">
          Nv.{role.level}
        </span>
      )}
    </span>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <div className="group relative inline-block">
      {badge}
      <div className="invisible absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 transform rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg opacity-0 transition-all group-hover:visible group-hover:opacity-100">
        <div className="whitespace-nowrap">
          <div className="font-semibold">{role.displayName}</div>
          <div className="mt-1 text-gray-300">
            Niveau {role.level}
          </div>
          <div className="mt-1 border-t border-gray-700 pt-1">
            <div className="text-gray-400">Peut appeler :</div>
            <div>{permissionsSummary}</div>
          </div>
        </div>
        {/* Tooltip arrow */}
        <div className="absolute top-full left-1/2 -ml-1 h-2 w-2 rotate-45 transform bg-gray-900"></div>
      </div>
    </div>
  );
}

/**
 * Level Badge - simplified badge showing only level
 */
export function LevelBadge({ level, className = '' }: { level: number; className?: string }) {
  const color = rolesService.getRoleColor(level);
  const icon = rolesService.getRoleIcon(level);

  const colorClasses = {
    purple: 'bg-purple-100 text-purple-800',
    blue: 'bg-blue-100 text-blue-800',
    indigo: 'bg-indigo-100 text-indigo-800',
    green: 'bg-green-100 text-green-800',
    gray: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${colorClasses[color as keyof typeof colorClasses]} ${className}`}>
      {icon} Niveau {level}
    </span>
  );
}

export default RoleBadge;
