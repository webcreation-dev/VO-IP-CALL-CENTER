import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, RefreshCw, ListOrdered, Phone, Users, Clock, TrendingDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/layout/PageHeader';

import QueuesList from '@/components/queues/QueuesList';
import QueueFormModal from '@/components/queues/QueueFormModal';

import queuesService, { type QueueEnriched } from '@/api/queues';
import { UserRole } from '@/api/auth';
import useAuthStore from '@/store/authStore';

export default function Queues() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState<QueueEnriched | null>(null);

  // Get user from store
  const { user } = useAuthStore();

  // Check if user can create queues (ADMIN or TENANT_ADMIN)
  const canCreate = user && (
    user.role === UserRole.SUPER_ADMIN ||
    user.role === UserRole.ADMIN ||
    user.role === UserRole.TENANT_ADMIN
  );

  // Fetch enriched queues with React Query
  const {
    data: queues,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['queues', 'enriched'],
    queryFn: () => queuesService.getEnriched(),
    refetchInterval: 5000, // Auto-refresh every 5 seconds for real-time stats
    staleTime: 2000,
  });

  // Fetch global stats
  const {
    data: globalStats,
    isLoading: isLoadingStats,
  } = useQuery({
    queryKey: ['queues', 'global-stats'],
    queryFn: () => queuesService.getGlobalStats(),
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    staleTime: 2000,
  });

  // Filter queues locally by search query
  const filteredQueues = Array.isArray(queues)
    ? queues.filter((queue) => {
        if (!searchQuery) return true;

        const query = searchQuery.toLowerCase();
        const displayName = queuesService.getDisplayName(queue).toLowerCase();
        const description = (queue.description || '').toLowerCase();

        return (
          queue.name.toLowerCase().includes(query) ||
          displayName.includes(query) ||
          description.includes(query)
        );
      })
    : [];

  // Handle create queue
  const handleCreateQueue = () => {
    setSelectedQueue(null);
    setIsFormOpen(true);
  };

  // Handle edit queue
  const handleEditQueue = (queue: QueueEnriched) => {
    setSelectedQueue(queue);
    setIsFormOpen(true);
  };

  // Handle form success
  const handleFormSuccess = () => {
    refetch();
  };

  return (
    <div className="h-full bg-background">
      <PageHeader
        title="Files d'attente"
        description="Gestion des files d'attente et statistiques en temps réel"
        actions={
          canCreate && (
            <Button onClick={handleCreateQueue}>
              <Plus className="h-4 w-4 mr-2" />
              Créer une file
            </Button>
          )
        }
      />

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Global Stats Cards */}
        {globalStats && !isLoadingStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Queues */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Files</CardTitle>
                <ListOrdered className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{globalStats.total_queues}</div>
                <p className="text-xs text-muted-foreground">
                  {globalStats.queues_active} actives • {globalStats.queues_busy} occupées
                </p>
              </CardContent>
            </Card>

            {/* Calls Waiting */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Appels en attente</CardTitle>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  globalStats.total_calls_waiting > 10 ? 'text-destructive' :
                  globalStats.total_calls_waiting > 5 ? 'text-yellow-600' :
                  'text-foreground'
                }`}>
                  {globalStats.total_calls_waiting}
                </div>
                <p className="text-xs text-muted-foreground">
                  {globalStats.total_calls_handled} traités aujourd'hui
                </p>
              </CardContent>
            </Card>

            {/* Agents */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Agents disponibles</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {globalStats.members_available}/{globalStats.total_members}
                </div>
                <p className="text-xs text-muted-foreground">
                  {globalStats.members_in_call} en appel • {globalStats.members_paused} en pause
                </p>
              </CardContent>
            </Card>

            {/* Longest Wait */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Temps d'attente max</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  globalStats.longest_wait_time_global > 300 ? 'text-destructive' :
                  globalStats.longest_wait_time_global > 120 ? 'text-yellow-600' :
                  'text-foreground'
                }`}>
                  {queuesService.formatTime(globalStats.longest_wait_time_global)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Taux abandon: {queuesService.formatPercentage(globalStats.global_abandonment_rate)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Top Busy Queues Alert */}
        {globalStats && globalStats.top_busy_queues && globalStats.top_busy_queues.length > 0 && (
          <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-yellow-600" />
                Files les plus chargées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {globalStats.top_busy_queues.slice(0, 3).map((busyQueue) => (
                  <div
                    key={busyQueue.queue_name}
                    className="flex items-center justify-between p-2 bg-background rounded border"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{busyQueue.queue_name}</span>
                      <span className="text-sm text-muted-foreground">
                        {busyQueue.calls_waiting} appels en attente
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        Temps max: {queuesService.formatTime(busyQueue.longest_wait_time)}
                      </span>
                      <span className="text-muted-foreground">
                        {busyQueue.members_available} agents disponibles
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Queues List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Liste des Files d'attente</CardTitle>
                <CardDescription>
                  {filteredQueues.length} file(s) • Mise à jour toutes les 5 secondes
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Search Bar */}
            <div className="flex items-center gap-2 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom ou description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Chargement des files d'attente...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-12">
                <p className="text-destructive mb-4">
                  Erreur lors du chargement des files d'attente
                </p>
                <Button variant="outline" onClick={() => refetch()}>
                  Réessayer
                </Button>
              </div>
            )}

            {/* Queues List */}
            {!isLoading && !error && filteredQueues && (
              <QueuesList
                queues={filteredQueues}
                onEdit={handleEditQueue}
                onRefresh={() => refetch()}
              />
            )}

            {/* No Results */}
            {!isLoading && !error && filteredQueues.length === 0 && queues && queues.length > 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Aucune file d'attente trouvée avec ces critères
                </p>
              </div>
            )}

            {/* No Queues at all */}
            {!isLoading && !error && queues?.length === 0 && (
              <div className="text-center py-12">
                <ListOrdered className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Aucune file d'attente créée pour le moment
                </p>
                {canCreate && (
                  <Button onClick={handleCreateQueue}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer la première file
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Queue Form Modal */}
      <QueueFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        queue={selectedQueue}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
