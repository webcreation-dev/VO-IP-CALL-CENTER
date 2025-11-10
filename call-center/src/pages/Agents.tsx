import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, RefreshCw, Filter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/layout/PageHeader';

import EndpointsList from '@/components/endpoints/EndpointsList';
import EndpointFormModal from '@/components/endpoints/EndpointFormModal';

import endpointsService, { type Endpoint } from '@/api/endpoints';
import { useRoles } from '@/hooks/useRoles';

export default function Agents() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);

  // Fetch enriched endpoints with real-time AMI data
  const {
    data: endpoints,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['endpoints', 'enriched'],
    queryFn: () => endpointsService.getEnrichedEndpoints(),
    refetchInterval: 10000, // Auto-refresh every 10 seconds
    staleTime: 5000,
  });

  // Fetch roles for filter
  const { data: rolesData } = useRoles(true);
  const roles = Array.isArray(rolesData) ? rolesData : [];

  // Filter endpoints based on search query and role
  const filteredEndpoints = Array.isArray(endpoints)
    ? endpoints.filter((endpoint) => {
        // Search query filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesSearch =
            endpoint.displayName.toLowerCase().includes(query) ||
            endpoint.callerid?.toLowerCase().includes(query) ||
            endpoint.context.toLowerCase().includes(query) ||
            endpoint.contactIP?.toLowerCase().includes(query);

          if (!matchesSearch) return false;
        }

        // Role filter
        if (selectedRoleId !== 'all') {
          if (selectedRoleId === 'none') {
            return !endpoint.roleId;
          }
          return endpoint.roleId?.toString() === selectedRoleId;
        }

        return true;
      })
    : [];

  // Handle create endpoint
  const handleCreateEndpoint = () => {
    setSelectedEndpoint(null);
    setIsFormOpen(true);
  };

  // Handle edit endpoint
  const handleEditEndpoint = (endpoint: Endpoint) => {
    setSelectedEndpoint(endpoint);
    setIsFormOpen(true);
  };

  // Handle form success
  const handleFormSuccess = () => {
    refetch();
  };

  return (
    <div className="h-full bg-background">
      <PageHeader
        title="Agents / Endpoints"
        description="Gestion des endpoints SIP et agents du call center"
        actions={
          <Button onClick={handleCreateEndpoint}>
            <Plus className="h-4 w-4 mr-2" />
            Créer un endpoint
          </Button>
        }
      />

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Liste des Endpoints</CardTitle>
                <CardDescription>
                  {endpoints?.length || 0} endpoint(s) enregistré(s)
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

            {/* Search Bar and Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, caller ID, contexte ou IP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrer par rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les rôles</SelectItem>
                  <SelectItem value="none">Sans rôle</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.displayName} (Niveau {role.level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent>
            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Chargement des endpoints...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-12">
                <p className="text-destructive mb-4">
                  Erreur lors du chargement des endpoints
                </p>
                <Button variant="outline" onClick={() => refetch()}>
                  Réessayer
                </Button>
              </div>
            )}

            {/* Endpoints List */}
            {!isLoading && !error && filteredEndpoints && (
              <EndpointsList
                endpoints={filteredEndpoints}
                onEdit={handleEditEndpoint}
                onRefresh={() => refetch()}
              />
            )}

            {/* No Results */}
            {!isLoading && !error && filteredEndpoints?.length === 0 && searchQuery && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Aucun endpoint trouvé pour "{searchQuery}"
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Endpoint Form Modal */}
      <EndpointFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        endpoint={selectedEndpoint}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
