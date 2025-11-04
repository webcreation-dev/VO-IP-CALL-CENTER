import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, Trash2, Users, Phone, Clock, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import type { Queue, Tenant } from '../../types/api';
import { useAuth } from '../../hooks/useAuth';
import QueueFormModal from './QueueFormModal';

const STRATEGY_LABELS: Record<string, string> = {
  ringall: 'Tous sonnent',
  leastrecent: 'Moins récent',
  fewestcalls: 'Moins d\'appels',
  random: 'Aléatoire',
  rrmemory: 'Round Robin (mémoire)',
  linear: 'Linéaire',
  wrandom: 'Aléatoire pondéré',
};

export default function QueuesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<number | 'ALL'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null);
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  // Fetch queues
  const { data: queues = [], isLoading } = useQuery<Queue[]>({
    queryKey: ['queues', selectedTenantId],
    queryFn: async () => {
      const url = selectedTenantId === 'ALL' || !selectedTenantId
        ? '/queues'
        : `/tenants/${selectedTenantId}/queues`;
      const response = await api.get(url);
      return response.data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds for real-time stats
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
    mutationFn: async (queueId: number) => {
      await api.delete(`/queues/${queueId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] });
    },
  });

  // Filter queues
  const filteredQueues = queues.filter((queue) =>
    queue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    queue.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const stats = {
    total: queues.length,
    totalMembers: queues.reduce((sum, q) => sum + (q.members?.length || 0), 0),
    avgWaitTime: Math.round(
      queues.reduce((sum, q) => sum + (q.avgWaitTime || 0), 0) / (queues.length || 1)
    ),
    totalCalls: queues.reduce((sum, q) => sum + (q.callsInQueue || 0), 0),
  };

  const handleEdit = (queue: Queue) => {
    setSelectedQueue(queue);
    setIsModalOpen(true);
  };

  const handleManageMembers = (queueId: number) => {
    navigate(`/queues/${queueId}/members`);
  };

  const handleDelete = async (queueId: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette queue ?')) {
      deleteMutation.mutate(queueId);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedQueue(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Files d'attente</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gérez les files d'attente et leurs membres
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nouvelle Queue
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Queues</dt>
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
                <UserPlus className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Membres</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.totalMembers}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Phone className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Appels en attente</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.totalCalls}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Temps d'attente moy.</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.avgWaitTime}s</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Rechercher par nom ou description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
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

      {/* Queues Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredQueues.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune queue trouvée</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery
                ? 'Essayez de modifier votre recherche'
                : 'Commencez par créer une nouvelle queue'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Queue
                  </th>
                  {isSuperAdmin && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tenant
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stratégie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Membres
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Appels
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Temps d'attente
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredQueues.map((queue) => (
                  <tr key={queue.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-indigo-100">
                          <Users className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{queue.name}</div>
                          <div className="text-sm text-gray-500">{queue.description || '-'}</div>
                        </div>
                      </div>
                    </td>
                    {isSuperAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {queue.tenant?.name || '-'}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {STRATEGY_LABELS[queue.strategy] || queue.strategy}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {queue.members?.length || 0} membres
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        (queue.callsInQueue || 0) > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {queue.callsInQueue || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {queue.avgWaitTime ? `${queue.avgWaitTime}s` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleManageMembers(queue.id)}
                        className="text-green-600 hover:text-green-900"
                        title="Gérer les membres"
                      >
                        <UserPlus className="h-5 w-5 inline" />
                      </button>
                      <button
                        onClick={() => handleEdit(queue)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Edit2 className="h-5 w-5 inline" />
                      </button>
                      <button
                        onClick={() => handleDelete(queue.id)}
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

      {/* Modal */}
      {isModalOpen && (
        <QueueFormModal
          queue={selectedQueue}
          tenants={tenants}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
