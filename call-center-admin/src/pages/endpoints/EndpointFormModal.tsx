import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import type { PsEndpoint, Tenant } from '../../types/api';

interface EndpointFormModalProps {
  endpoint: PsEndpoint | null;
  tenants: Tenant[];
  onClose: () => void;
}

interface EndpointFormData {
  endpoint: string;
  auth: string;
  aors?: string;
  callerid?: string;
  context?: string;
  allow?: string;
  directMedia?: string;
  transport?: string;
  dtmfMode?: string;
  tenantId: number;
}

export default function EndpointFormModal({ endpoint, tenants, onClose }: EndpointFormModalProps) {
  const queryClient = useQueryClient();
  const { isSuperAdmin, user } = useAuth();
  const isEditing = !!endpoint;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<EndpointFormData>({
    defaultValues: {
      endpoint: endpoint?.endpoint || '',
      auth: endpoint?.auth || '',
      aors: endpoint?.aors || '',
      callerid: endpoint?.callerid || '',
      context: endpoint?.context || 'from-internal',
      allow: endpoint?.allow || 'ulaw,alaw,gsm,g729',
      directMedia: endpoint?.directMedia || 'no',
      transport: endpoint?.transport || 'transport-udp',
      dtmfMode: endpoint?.dtmfMode || 'rfc4733',
      tenantId: endpoint?.tenantId || user?.tenantId || undefined,
    },
  });

  const endpointName = watch('endpoint');

  useEffect(() => {
    if (endpoint) {
      reset({
        endpoint: endpoint.endpoint,
        auth: endpoint.auth,
        aors: endpoint.aors || '',
        callerid: endpoint.callerid || '',
        context: endpoint.context || 'from-internal',
        allow: endpoint.allow || 'ulaw,alaw,gsm,g729',
        directMedia: endpoint.directMedia || 'no',
        transport: endpoint.transport || 'transport-udp',
        dtmfMode: endpoint.dtmfMode || 'rfc4733',
        tenantId: endpoint.tenantId,
      });
    }
  }, [endpoint, reset]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: EndpointFormData) => {
      const response = await api.post('/endpoints', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints'] });
      onClose();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: EndpointFormData) => {
      const response = await api.put(`/endpoints/${endpoint!.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints'] });
      onClose();
    },
  });

  const onSubmit = (data: EndpointFormData) => {
    // Auto-populate auth and aors if empty
    if (!data.auth) {
      data.auth = data.endpoint;
    }
    if (!data.aors) {
      data.aors = data.endpoint;
    }

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
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                {isEditing ? 'Modifier l\'endpoint' : 'Nouvel endpoint'}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Endpoint Name */}
                <div>
                  <label htmlFor="endpoint" className="block text-sm font-medium text-gray-700">
                    Nom de l'endpoint <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="endpoint"
                    {...register('endpoint', { required: 'Le nom est requis' })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="1001"
                    disabled={isEditing}
                  />
                  {errors.endpoint && (
                    <p className="mt-1 text-sm text-red-600">{errors.endpoint.message}</p>
                  )}
                </div>

                {/* Auth */}
                <div>
                  <label htmlFor="auth" className="block text-sm font-medium text-gray-700">
                    Auth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="auth"
                    {...register('auth', { required: 'L\'auth est requis' })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder={endpointName || '1001'}
                  />
                  {errors.auth && (
                    <p className="mt-1 text-sm text-red-600">{errors.auth.message}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-500">Par défaut: même nom que l'endpoint</p>
                </div>

                {/* AORs */}
                <div>
                  <label htmlFor="aors" className="block text-sm font-medium text-gray-700">
                    AORs
                  </label>
                  <input
                    type="text"
                    id="aors"
                    {...register('aors')}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder={endpointName || '1001'}
                  />
                  <p className="mt-1 text-sm text-gray-500">Par défaut: même nom que l'endpoint</p>
                </div>

                {/* Caller ID */}
                <div>
                  <label htmlFor="callerid" className="block text-sm font-medium text-gray-700">
                    Caller ID
                  </label>
                  <input
                    type="text"
                    id="callerid"
                    {...register('callerid')}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="John Doe <1001>"
                  />
                </div>

                {/* Context */}
                <div>
                  <label htmlFor="context" className="block text-sm font-medium text-gray-700">
                    Contexte
                  </label>
                  <input
                    type="text"
                    id="context"
                    {...register('context')}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="from-internal"
                  />
                </div>

                {/* Transport */}
                <div>
                  <label htmlFor="transport" className="block text-sm font-medium text-gray-700">
                    Transport
                  </label>
                  <select
                    id="transport"
                    {...register('transport')}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="transport-udp">UDP</option>
                    <option value="transport-tcp">TCP</option>
                    <option value="transport-tls">TLS</option>
                    <option value="transport-ws">WebSocket</option>
                    <option value="transport-wss">WebSocket Secure</option>
                  </select>
                </div>
              </div>

              {/* Codec Allow */}
              <div>
                <label htmlFor="allow" className="block text-sm font-medium text-gray-700">
                  Codecs autorisés
                </label>
                <input
                  type="text"
                  id="allow"
                  {...register('allow')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="ulaw,alaw,gsm,g729"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Liste séparée par des virgules (ex: ulaw,alaw,gsm,g729)
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Direct Media */}
                <div>
                  <label htmlFor="directMedia" className="block text-sm font-medium text-gray-700">
                    Direct Media
                  </label>
                  <select
                    id="directMedia"
                    {...register('directMedia')}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="no">Non</option>
                    <option value="yes">Oui</option>
                  </select>
                </div>

                {/* DTMF Mode */}
                <div>
                  <label htmlFor="dtmfMode" className="block text-sm font-medium text-gray-700">
                    Mode DTMF
                  </label>
                  <select
                    id="dtmfMode"
                    {...register('dtmfMode')}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="rfc4733">RFC 4733</option>
                    <option value="inband">In-band</option>
                    <option value="info">SIP INFO</option>
                    <option value="auto">Auto</option>
                  </select>
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
