import React, { useState } from 'react';
import { Plus, Search, BarChart3, Users, Shield } from 'lucide-react';
import { useRoles, useRoleStatistics, useDeleteRole } from '../hooks/useRoles';
import { RoleBadge, LevelBadge } from '../components/roles/RoleBadge';
import { RoleFormModal } from '../components/roles/RoleFormModal';
import type { EndpointRole } from '../types/roles';

/**
 * Roles Management Page
 *
 * Features:
 * - List all roles with statistics
 * - Create/Edit/Delete roles
 * - Apply role presets
 * - View role hierarchies
 * - Search and filter roles
 */
export function Roles() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<EndpointRole | null>(null);

  // Fetch data
  const { data: roles = [], isLoading: isLoadingRoles } = useRoles();
  const { data: statistics, isLoading: isLoadingStats } = useRoleStatistics();
  const deleteRoleMutation = useDeleteRole();

  // Filter roles
  const filteredRoles = roles.filter((role) => {
    const matchesSearch =
      role.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLevel = selectedLevel === null || role.level === selectedLevel;

    return matchesSearch && matchesLevel;
  });

  // Handle delete role
  const handleDeleteRole = async (role: EndpointRole) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le rôle "${role.displayName}" ?`)) {
      try {
        await deleteRoleMutation.mutateAsync(role.id);
        alert('Rôle supprimé avec succès !');
      } catch (error: any) {
        alert(`Erreur lors de la suppression : ${error.message}`);
      }
    }
  };

  if (isLoadingRoles || isLoadingStats) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Chargement des rôles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gestion des Rôles</h1>
        <p className="mt-2 text-gray-600">
          Gérez les rôles hiérarchiques et les permissions d'appel
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Roles */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total des Rôles</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {statistics?.totalRoles || 0}
              </p>
            </div>
            <div className="rounded-full bg-indigo-100 p-3">
              <Shield className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>

        {/* Active Roles */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rôles Actifs</p>
              <p className="mt-2 text-3xl font-bold text-green-600">
                {statistics?.activeRoles || 0}
              </p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Hierarchy Levels */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Niveaux</p>
              <p className="mt-2 text-3xl font-bold text-purple-600">
                {statistics?.levels?.length || 0}
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Inactive Roles */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rôles Inactifs</p>
              <p className="mt-2 text-3xl font-bold text-gray-400">
                {statistics?.inactiveRoles || 0}
              </p>
            </div>
            <div className="rounded-full bg-gray-100 p-3">
              <Shield className="h-6 w-6 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un rôle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Level Filter */}
        <select
          value={selectedLevel || ''}
          onChange={(e) => setSelectedLevel(e.target.value ? Number(e.target.value) : null)}
          className="rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Tous les niveaux</option>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => (
            <option key={level} value={level}>
              Niveau {level}
            </option>
          ))}
        </select>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <Plus className="h-5 w-5" />
            Nouveau Rôle
          </button>
        </div>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {filteredRoles.map((role) => (
          <div
            key={role.id}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {role.displayName}
                  </h3>
                  <LevelBadge level={role.level} />
                </div>
                <p className="mt-1 text-sm text-gray-500">{role.name}</p>
              </div>
              {!role.isActive && (
                <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                  Inactif
                </span>
              )}
            </div>

            {/* Description */}
            {role.description && (
              <p className="mt-3 text-sm text-gray-600">{role.description}</p>
            )}

            {/* Permissions */}
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase">Permissions</p>
              <div className="flex flex-wrap gap-2">
                {role.canCallSameLevel && (
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">
                    ➡️ Même niveau
                  </span>
                )}
                {role.canCallLowerLevel && (
                  <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs text-green-700">
                    ⬇️ Niveaux inférieurs
                  </span>
                )}
                {role.canCallHigherLevel && (
                  <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-1 text-xs text-purple-700">
                    ⬆️ Niveaux supérieurs
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4">
              <button
                onClick={() => setSelectedRole(role)}
                className="flex-1 rounded-lg border border-indigo-600 px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
              >
                Modifier
              </button>
              <button
                onClick={() => handleDeleteRole(role)}
                disabled={deleteRoleMutation.isPending}
                className="flex-1 rounded-lg border border-red-600 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredRoles.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Aucun rôle trouvé</h3>
          <p className="mt-2 text-sm text-gray-500">
            {searchTerm || selectedLevel
              ? 'Essayez de modifier vos critères de recherche.'
              : 'Commencez par créer votre premier rôle ou appliquer un preset.'}
          </p>
          {!searchTerm && !selectedLevel && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
            >
              <Plus className="h-5 w-5" />
              Créer un Rôle
            </button>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <RoleFormModal
        role={selectedRole}
        isOpen={isCreateModalOpen || !!selectedRole}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedRole(null);
        }}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          setSelectedRole(null);
        }}
      />
    </div>
  );
}

export default Roles;
