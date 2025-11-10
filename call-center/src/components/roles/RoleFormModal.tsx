import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { useCreateRole, useUpdateRole } from '../../hooks/useRoles';
import type { EndpointRole, CreateRoleDto, UpdateRoleDto } from '../../types/roles';
import { LevelBadge } from './RoleBadge';

interface RoleFormModalProps {
  role?: EndpointRole | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Modal form for creating or editing roles
 *
 * Features:
 * - Interactive level slider (1-10)
 * - Permission checkboxes with clear labels
 * - Real-time validation
 * - Preview of permissions
 * - User-friendly error messages
 */
export function RoleFormModal({ role, isOpen, onClose, onSuccess }: RoleFormModalProps) {
  const isEditMode = !!role;

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    level: 5,
    canCallSameLevel: true,
    canCallLowerLevel: false,
    canCallHigherLevel: false,
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mutations
  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole();

  // Initialize form with existing role data
  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        displayName: role.displayName,
        description: role.description || '',
        level: role.level,
        canCallSameLevel: role.canCallSameLevel,
        canCallLowerLevel: role.canCallLowerLevel,
        canCallHigherLevel: role.canCallHigherLevel,
        isActive: role.isActive,
      });
    } else {
      // Reset form for create mode
      setFormData({
        name: '',
        displayName: '',
        description: '',
        level: 5,
        canCallSameLevel: true,
        canCallLowerLevel: false,
        canCallHigherLevel: false,
        isActive: true,
      });
    }
    setErrors({});
  }, [role, isOpen]);

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    } else if (!/^[a-z0-9_]+$/.test(formData.name)) {
      newErrors.name = 'Le nom doit contenir uniquement des lettres minuscules, chiffres et underscores';
    }

    if (!formData.displayName.trim()) {
      newErrors.displayName = "Le nom d'affichage est requis";
    }

    if (formData.level < 1 || formData.level > 10) {
      newErrors.level = 'Le niveau doit être entre 1 et 10';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      if (isEditMode && role) {
        // Update existing role
        const updateData: UpdateRoleDto = {
          displayName: formData.displayName,
          description: formData.description || undefined,
          canCallSameLevel: formData.canCallSameLevel,
          canCallLowerLevel: formData.canCallLowerLevel,
          canCallHigherLevel: formData.canCallHigherLevel,
          isActive: formData.isActive,
        };

        await updateRoleMutation.mutateAsync({ id: role.id, data: updateData });
        alert('Rôle modifié avec succès !');
      } else {
        // Create new role
        const createData: CreateRoleDto = {
          name: formData.name,
          displayName: formData.displayName,
          description: formData.description || undefined,
          level: formData.level,
          canCallSameLevel: formData.canCallSameLevel,
          canCallLowerLevel: formData.canCallLowerLevel,
          canCallHigherLevel: formData.canCallHigherLevel,
          isActive: formData.isActive,
        };

        await createRoleMutation.mutateAsync(createData);
        alert('Rôle créé avec succès !');
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
      alert(`Erreur : ${error.message}`);
    }
  };

  if (!isOpen) return null;

  const isSubmitting = createRoleMutation.isPending || updateRoleMutation.isPending;

  // Get permission summary
  const getPermissionSummary = () => {
    const permissions: string[] = [];
    if (formData.canCallSameLevel) permissions.push('même niveau');
    if (formData.canCallLowerLevel) permissions.push('niveaux inférieurs');
    if (formData.canCallHigherLevel) permissions.push('niveaux supérieurs');
    return permissions.length > 0 ? permissions.join(', ') : 'aucune permission';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-card shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-foreground">
            {isEditMode ? 'Modifier le Rôle' : '✨ Nouveau Rôle'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Name (only for creation) */}
            {!isEditMode && (
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Nom (identifiant unique) *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase() })}
                  className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600"
                  placeholder="agent, supervisor, manager..."
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Lettres minuscules, chiffres et underscores uniquement
                </p>
              </div>
            )}

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-foreground">
                Nom d'affichage *
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600"
                placeholder="Agent, Superviseur, Manager..."
              />
              {errors.displayName && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.displayName}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600"
                placeholder="Description du rôle..."
              />
            </div>

            {/* Level Slider (only for creation) */}
            {!isEditMode && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  🎚️ Niveau hiérarchique *
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground w-12">1</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: Number(e.target.value) })}
                    className="flex-1 h-2 bg-accent rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:bg-gray-700"
                  />
                  <span className="text-sm text-muted-foreground w-12 text-right">10</span>
                </div>
                <div className="mt-2 flex items-center justify-center">
                  <LevelBadge level={formData.level} className="text-lg" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground text-center">
                  1 = Niveau le plus bas (Agent) • 10 = Niveau le plus haut (Directeur)
                </p>
              </div>
            )}

            {/* Permissions */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                📞 Permissions d'appel
              </label>
              <div className="space-y-3">
                {/* Same Level */}
                <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent dark:border-gray-700 dark:hover:bg-gray-700/50">
                  <input
                    type="checkbox"
                    checked={formData.canCallSameLevel}
                    onChange={(e) => setFormData({ ...formData, canCallSameLevel: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-input text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-foreground">➡️ Appeler même niveau</span>
                    <p className="text-sm text-muted-foreground">
                      Autorise les appels vers des utilisateurs du même niveau hiérarchique
                    </p>
                  </div>
                </label>

                {/* Lower Levels */}
                <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent dark:border-gray-700 dark:hover:bg-gray-700/50">
                  <input
                    type="checkbox"
                    checked={formData.canCallLowerLevel}
                    onChange={(e) => setFormData({ ...formData, canCallLowerLevel: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-input text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-foreground">⬇️ Appeler niveaux inférieurs</span>
                    <p className="text-sm text-muted-foreground">
                      Autorise les appels vers des utilisateurs de niveaux hiérarchiques inférieurs
                    </p>
                  </div>
                </label>

                {/* Higher Levels */}
                <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent dark:border-gray-700 dark:hover:bg-gray-700/50">
                  <input
                    type="checkbox"
                    checked={formData.canCallHigherLevel}
                    onChange={(e) => setFormData({ ...formData, canCallHigherLevel: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-input text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-foreground">⬆️ Appeler niveaux supérieurs</span>
                    <p className="text-sm text-muted-foreground">
                      Autorise les appels vers des utilisateurs de niveaux hiérarchiques supérieurs
                    </p>
                  </div>
                </label>
              </div>

              {/* Permission Preview */}
              <div className="mt-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/30">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5 dark:text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Aperçu des permissions</p>
                    <p className="text-sm text-blue-700 mt-1 dark:text-blue-400">
                      Ce rôle pourra appeler : <span className="font-semibold">{getPermissionSummary()}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Status */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-input text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-foreground">Rôle actif</span>
            </label>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-lg border border-input px-4 py-2 text-foreground hover:bg-accent disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isEditMode ? 'Modifier' : 'Créer'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RoleFormModal;
