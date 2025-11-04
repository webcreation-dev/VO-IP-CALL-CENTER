import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import type { TenantContext, Tenant } from '../../types/api';

interface ContextFormModalProps {
  context: TenantContext | null;
  tenants: Tenant[];
  onClose: () => void;
}

interface ContextFormData {
  name: string;
  description?: string;
  tenantId: number;
  active: boolean;
}

export default function ContextFormModal({ context, tenants, onClose }: ContextFormModalProps) {
  const queryClient = useQueryClient();
  const { isSuperAdmin, user } = useAuth();
  const isEditing = !!context;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContextFormData>({
    defaultValues: {
      name: context?.name || '',
      description: context?.description || '',
      tenantId: context?.tenantId || user?.tenantId || undefined,
      active: context?.active ?? true,
    },
  });

  useEffect(() => {
    if (context) {
      reset({
        name: context.name,
        description: context.description || '',
        tenantId: context.tenantId,
        active: context.active,
      });
    }
  }, [context, reset]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: ContextFormData) => {
      const response = await api.post('/contexts', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contexts'] });
      onClose();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: ContextFormData) => {
      const response = await api.put(`/contexts/${context!.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contexts'] });
      onClose();
    },
  });

  const onSubmit = (data: ContextFormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                {isEditing ? 'Modifier le contexte' : 'Nouveau contexte'}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                <p className="text-sm">
                  {error instanceof Error ? error.message : 'Une erreur est survenue'}
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nom du contexte <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  {...register('name', { required: 'Le nom est requis' })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="ex: from-internal, from-external"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Le nom du contexte utilisé dans le dialplan Asterisk
                </p>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={3}
                  {...register('description')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Description du contexte..."
                />
              </div>

              {/* Tenant (Super Admin only) */}
              {isSuperAdmin && (
                <div>
                  <label htmlFor="tenantId" className="block text-sm font-medium text-gray-700">
                    Tenant <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="tenantId"
                    {...register('tenantId', {
                      required: 'Le tenant est requis',
                      valueAsNumber: true,
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">Sélectionner un tenant</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                  {errors.tenantId && (
                    <p className="mt-1 text-sm text-red-600">{errors.tenantId.message}</p>
                  )}
                </div>
              )}

              {/* Active Status */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  {...register('active')}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                  Contexte actif
                </label>
              </div>

              {/* Actions */}
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
