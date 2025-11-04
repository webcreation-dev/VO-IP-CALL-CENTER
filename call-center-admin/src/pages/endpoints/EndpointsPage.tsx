import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, Trash2, Phone, PhoneOff, PhoneCall, Users as UsersIcon } from 'lucide-react';
import api from '../../services/api';
import type { PsEndpoint, Tenant } from '../../types/api';
import { useAuth } from '../../hooks/useAuth';
import EndpointFormModal from './EndpointFormModal';
import EndpointDetailsModal from './EndpointDetailsModal';

export default function EndpointsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<number | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<PsEndpoint | null>(null);
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useAuth();

  // Fetch endpoints
  const { data: endpoints = [], isLoading } = useQuery<PsEndpoint[]>({
    queryKey: ['endpoints', selectedTenantId],
    queryFn: async () => {
      const url = selectedTenantId === 'ALL' || !selectedTenantId
        ? '/endpoints'
        : `/tenants/${selectedTenantId}/endpoints`;
      const response = await api.get(url);
      return response.data;
    },
    refetchInterval: 10000, // Refresh every 10 seconds for status updates
  });

  // Fetch tenants (for dropdown)
  const { data: tenants = [] } = useQuery<Tenant[]>({
    queryKey: ['tenants'],
    queryFn: async () => {
      const response = await api.get('/tenants');
      return response.data;
    },
    enabled: isSuperAdmin,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (endpointId: number) => {
      await api.delete(`/endpoints/${endpointId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints'] });
    },
  });

  // Filter endpoints
  const filteredEndpoints = endpoints.filter((endpoint) => {
    const matchesSearch =
      endpoint.endpoint?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      endpoint.callerid?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ONLINE' && endpoint.status === 'ONLINE') ||
      (statusFilter === 'OFFLINE' && endpoint.status !== 'ONLINE');

    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: endpoints.length,
    online: endpoints.filter((e) => e.status === 'ONLINE').length,
    offline: endpoints.filter((e) => e.status !== 'ONLINE').length,
    registered: endpoints.filter((e) => e.deviceState === 'NOT_INUSE').length,
  };

  const handleEdit = (endpoint: PsEndpoint) => {
    setSelectedEndpoint(endpoint);
    setIsFormModalOpen(true);
  };

  const handleViewDetails = (endpoint: PsEndpoint) => {
    setSelectedEndpoint(endpoint);
    setIsDetailsModalOpen(true);
  };

  const handleDelete = async (endpointId: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet endpoint ?')) {
      deleteMutation.mutate(endpointId);
    }
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setSelectedEndpoint(null);
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedEndpoint(null);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ONLINE':
        return 'text-green-600';
      case 'OFFLINE':
      default:
        return 'text-gray-400';
    }
  };

  const getStatusBadge = (status?: string) => {
    const isOnline = status === 'ONLINE';
    return (
      <span
        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}
      >
        {isOnline ? 'En ligne' : 'Hors ligne'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Endpoints SIP</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gérez les endpoints PJSIP et suivez leur statut en temps réel
          </p>
        </div>
        <button
          onClick={() => setIsFormModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nouvel Endpoint
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Phone className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Endpoints</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.total}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PhoneCall className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">En ligne</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.online}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PhoneOff className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Hors ligne</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.offline}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Enregistrés</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.registered}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Rechercher par endpoint ou caller ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ONLINE' | 'OFFLINE')}
              className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="ONLINE">En ligne</option>
              <option value="OFFLINE">Hors ligne</option>
            </select>
          </div>

          {/* Tenant Filter (Super Admin only) */}
          {isSuperAdmin && (
            <div>
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="ALL">Tous les tenants</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Endpoints Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredEndpoints.length === 0 ? (
          <div className="text-center py-12">
            <Phone className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun endpoint trouvé</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || statusFilter !== 'ALL'
                ? 'Essayez de modifier vos filtres'
                : 'Commencez par créer un nouvel endpoint'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Endpoint
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Caller ID
                  </th>
                  {isSuperAdmin && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tenant
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transport
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contexte
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEndpoints.map((endpoint) => (
                  <tr key={endpoint.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full ${
                          endpoint.status === 'ONLINE' ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <Phone className={`h-5 w-5 ${getStatusColor(endpoint.status)}`} />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{endpoint.endpoint}</div>
                          <div className="text-sm text-gray-500">{endpoint.auth}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {endpoint.callerid || '-'}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {endpoint.tenant?.name || '-'}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(endpoint.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {endpoint.transport || 'UDP'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {endpoint.context || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleViewDetails(endpoint)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Détails
                      </button>
                      <button
                        onClick={() => handleEdit(endpoint)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Edit2 className="h-5 w-5 inline" />
                      </button>
                      <button
                        onClick={() => handleDelete(endpoint.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {isFormModalOpen && (
        <EndpointFormModal
          endpoint={selectedEndpoint}
          tenants={tenants}
          onClose={handleCloseFormModal}
        />
      )}

      {isDetailsModalOpen && selectedEndpoint && (
        <EndpointDetailsModal
          endpoint={selectedEndpoint}
          onClose={handleCloseDetailsModal}
        />
      )}
    </div>
  );
}
