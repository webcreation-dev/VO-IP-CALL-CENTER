import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, RefreshCw, Server, Activity, AlertCircle, Link as LinkIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/layout/PageHeader';

import TrunksList from '@/components/trunks/TrunksList';
import TrunkFormModal from '@/components/trunks/TrunkFormModal';

import trunksService, { type TrunkWithStatus } from '@/api/trunks';
import { UserRole } from '@/api/auth';
import useAuthStore from '@/store/authStore';

export default function Trunks() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTrunk, setSelectedTrunk] = useState<TrunkWithStatus | null>(null);

  // Get user from store
  const { user } = useAuthStore();

  // Only ADMIN can access trunks
  const canCreate = user?.role === UserRole.ADMIN;

  // Fetch trunks with status using React Query
  const {
    data: trunks,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['trunks', 'with-status'],
    queryFn: () => trunksService.getAllWithStatus(),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    staleTime: 10000,
  });

  // Filter trunks locally by search query
  const filteredTrunks = Array.isArray(trunks)
    ? trunks.filter((trunk) => {
        if (!searchQuery) return true;

        const query = searchQuery.toLowerCase();
        const displayName = trunksService.getDisplayName(trunk).toLowerCase();
        const description = (trunk.description || '').toLowerCase();
        const remoteHost = (trunk.remoteHost || '').toLowerCase();

        return (
          trunk.name.toLowerCase().includes(query) ||
          displayName.includes(query) ||
          description.includes(query) ||
          remoteHost.includes(query)
        );
      })
    : [];

  // Calculate stats
  const stats = {
    total: trunks?.length || 0,
    associated: trunks?.filter((t) => t.tenantId !== null).length || 0,
    unassociated: trunks?.filter((t) => t.tenantId === null).length || 0,
    registered: trunks?.filter((t) => t.isRegistered).length || 0,
  };

  // Handle create trunk
  const handleCreateTrunk = () => {
    setSelectedTrunk(null);
    setIsFormOpen(true);
  };

  // Handle edit trunk
  const handleEditTrunk = (trunk: TrunkWithStatus) => {
    setSelectedTrunk(trunk);
    setIsFormOpen(true);
  };

  // Handle form success
  const handleFormSuccess = () => {
    refetch();
  };

  return (
    <div className="h-full bg-background">
      <PageHeader
        title="Interconnexions SIP"
        description="Gestion des trunks SIP et registrations"
        actions={
          canCreate && (
            <Button onClick={handleCreateTrunk}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un trunk
            </Button>
          )
        }
      />

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Stats Cards */}
        {trunks && !isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Total Trunks */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Trunks</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">
                  Interconnexions configurées
                </p>
              </CardContent>
            </Card>

            {/* Associated */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Associés</CardTitle>
                <LinkIcon className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.associated}
                </div>
                <p className="text-xs text-muted-foreground">
                  Trunks liés à un tenant
                </p>
              </CardContent>
            </Card>

            {/* Unassociated */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Non associés</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  stats.unassociated > 0 ? 'text-yellow-600' : 'text-foreground'
                }`}>
                  {stats.unassociated}
                </div>
                <p className="text-xs text-muted-foreground">
                  Trunks sans tenant
                </p>
              </CardContent>
            </Card>

            {/* Registered */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Enregistrés</CardTitle>
                <Activity className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats.registered}
                </div>
                <p className="text-xs text-muted-foreground">
                  Trunks actifs
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Trunks List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Liste des Trunks SIP</CardTitle>
                <CardDescription>
                  {filteredTrunks.length} trunk(s) • Mise à jour toutes les 30 secondes
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
                  placeholder="Rechercher par nom, description ou serveur..."
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
                <p className="text-muted-foreground">Chargement des trunks...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-12">
                <p className="text-destructive mb-4">
                  Erreur lors du chargement des trunks
                </p>
                <Button variant="outline" onClick={() => refetch()}>
                  Réessayer
                </Button>
              </div>
            )}

            {/* Trunks List */}
            {!isLoading && !error && filteredTrunks && (
              <TrunksList
                trunks={filteredTrunks}
                onEdit={handleEditTrunk}
                onRefresh={() => refetch()}
              />
            )}

            {/* No Results */}
            {!isLoading && !error && filteredTrunks.length === 0 && trunks && trunks.length > 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Aucun trunk trouvé avec ces critères
                </p>
              </div>
            )}

            {/* No Trunks at all */}
            {!isLoading && !error && trunks?.length === 0 && (
              <div className="text-center py-12">
                <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Aucun trunk SIP configuré pour le moment
                </p>
                {canCreate && (
                  <Button onClick={handleCreateTrunk}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer le premier trunk
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Trunk Form Modal */}
      <TrunkFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        trunk={selectedTrunk}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
