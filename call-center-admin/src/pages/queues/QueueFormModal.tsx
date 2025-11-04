import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import type { Queue, Tenant, QueueStrategy } from '../../types/api';

interface QueueFormModalProps {
  queue: Queue | null;
  tenants: Tenant[];
  onClose: () => void;
}

interface QueueFormData {
  name: string;
  description?: string;
  strategy: QueueStrategy;
  timeout?: number;
  maxlen?: number;
  weight?: number;
  wrapuptime?: number;
  tenantId: number;
}

const STRATEGY_OPTIONS: { value: QueueStrategy; label: string; description: string }[] = [
  { value: 'ringall', label: 'Tous sonnent', description: 'Tous les membres sonnent simultanément' },
  { value: 'leastrecent', label: 'Moins récent', description: 'Appelle le membre qui n\'a pas reçu d\'appel depuis le plus longtemps' },
  { value: 'fewestcalls', label: 'Moins d\'appels', description: 'Appelle le membre avec le moins d\'appels' },
  { value: 'random', label: 'Aléatoire', description: 'Sélectionne un membre au hasard' },
  { value: 'rrmemory', label: 'Round Robin (mémoire)', description: 'Tour à tour avec mémoire' },
  { value: 'linear', label: 'Linéaire', description: 'Dans l\'ordre de la liste' },
  { value: 'wrandom', label: 'Aléatoire pondéré', description: 'Aléatoire basé sur les poids' },
];

export default function QueueFormModal({ queue, tenants, onClose }: QueueFormModalProps) {
  const queryClient = useQueryClient();
  const { isSuperAdmin, user } = useAuth();
  const isEditing = !!queue;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<QueueFormData>({
    defaultValues: {
      name: queue?.name || '',
      description: queue?.description || '',
      strategy: queue?.strategy || 'ringall',
      timeout: queue?.timeout || 15,
      maxlen: queue?.maxlen || 0,
      weight: queue?.weight || 0,
      wrapuptime: queue?.wrapuptime || 0,
      tenantId: queue?.tenantId || user?.tenantId || undefined,
    },
  });

  useEffect(() => {
    if (queue) {
      reset({
        name: queue.name,
        description: queue.description || '',
        strategy: queue.strategy,
        timeout: queue.timeout || 15,
        maxlen: queue.maxlen || 0,
        weight: queue.weight || 0,
        wrapuptime: queue.wrapuptime || 0,
        tenantId: queue.tenantId,
      });
    }
  }, [queue, reset]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: QueueFormData) => {
      const response = await api.post('/queues', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      onClose();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: QueueFormData) => {
      const response = await api.put(`/queues/${queue!.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      onClose();
    },
  });

  const onSubmit = (data: QueueFormData) => {
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
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                {isEditing ? 'Modifier la queue' : 'Nouvelle queue'}
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
                  Nom de la queue <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  {...register('name', { required: 'Le nom est requis' })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="support, ventes, technique..."
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
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
                  placeholder="Description de la queue..."
                />
              </div>

              {/* Strategy */}
              <div>
                <label htmlFor="strategy" className="block text-sm font-medium text-gray-700">
                  Stratégie de distribution <span className="text-red-500">*</span>
                </label>
                <select
                  id="strategy"
                  {...register('strategy', { required: 'La stratégie est requise' })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  {STRATEGY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} - {option.description}
                    </option>
                  ))}
                </select>
                {errors.strategy && (
                  <p className="mt-1 text-sm text-red-600">{errors.strategy.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Timeout */}
                <div>
                  <label htmlFor="timeout" className="block text-sm font-medium text-gray-700">
                    Timeout (secondes)
                  </label>
                  <input
                    type="number"
                    id="timeout"
                    {...register('timeout', {
                      valueAsNumber: true,
                      min: { value: 1, message: 'Minimum 1 seconde' },
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="15"
                  />
                  {errors.timeout && (
                    <p className="mt-1 text-sm text-red-600">{errors.timeout.message}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-500">Durée de sonnerie par membre</p>
                </div>

                {/* Max Length */}
                <div>
                  <label htmlFor="maxlen" className="block text-sm font-medium text-gray-700">
                    Nombre max d'appels
                  </label>
                  <input
                    type="number"
                    id="maxlen"
                    {...register('maxlen', {
                      valueAsNumber: true,
                      min: { value: 0, message: 'Minimum 0' },
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="0"
                  />
                  {errors.maxlen && (
                    <p className="mt-1 text-sm text-red-600">{errors.maxlen.message}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-500">0 = illimité</p>
                </div>

                {/* Weight */}
                <div>
                  <label htmlFor="weight" className="block text-sm font-medium text-gray-700">
                    Poids
                  </label>
                  <input
                    type="number"
                    id="weight"
                    {...register('weight', {
                      valueAsNumber: true,
                      min: { value: 0, message: 'Minimum 0' },
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="0"
                  />
                  {errors.weight && (
                    <p className="mt-1 text-sm text-red-600">{errors.weight.message}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-500">Priorité de la queue</p>
                </div>

                {/* Wrapup Time */}
                <div>
                  <label htmlFor="wrapuptime" className="block text-sm font-medium text-gray-700">
                    Temps de pause (secondes)
                  </label>
                  <input
                    type="number"
                    id="wrapuptime"
                    {...register('wrapuptime', {
                      valueAsNumber: true,
                      min: { value: 0, message: 'Minimum 0' },
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="0"
                  />
                  {errors.wrapuptime && (
                    <p className="mt-1 text-sm text-red-600">{errors.wrapuptime.message}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-500">Temps après appel avant nouvelle sonnerie</p>
                </div>
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
