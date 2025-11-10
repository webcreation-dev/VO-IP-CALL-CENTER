import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, RefreshCw, Filter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import PageHeader from '@/components/layout/PageHeader';

import TenantsList from '@/components/tenants/TenantsList';
import TenantFormModal from '@/components/tenants/TenantFormModal';

import tenantsService, { type Tenant, type TenantFilterDto } from '@/api/tenants';
import authService, { UserRole } from '@/api/auth';
import useAuthStore from '@/store/authStore';

export default function Tenants() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filters
  const [isActiveFilter, setIsActiveFilter] = useState<string>('all');
  const [minEndpoints, setMinEndpoints] = useState<string>('');
  const [maxEndpoints, setMaxEndpoints] = useState<string>('');

  // Get user from store
  const { user } = useAuthStore();

  // Check if user can create tenants (ADMIN only)
  const canCreate = user && user.role === UserRole.ADMIN;

  // Debug log
  console.log('User role:', user?.role);
  console.log('Can create:', canCreate);

  // Build filter object
  const buildFilters = (): TenantFilterDto => {
    const filters: TenantFilterDto = {
      page: 1,
      limit: 100, // Show all tenants (adjust if pagination needed)
      order: 'DESC',
      sortBy: 'createdAt',
    };

    if (searchQuery) {
      filters.search = searchQuery;
    }

    if (isActiveFilter !== 'all') {
      filters.isActive = isActiveFilter === 'active';
    }

    if (minEndpoints) {
      filters.minMaxEndpoints = parseInt(minEndpoints, 10);
    }

    if (maxEndpoints) {
      filters.maxMaxEndpoints = parseInt(maxEndpoints, 10);
    }

    return filters;
  };

  // Fetch tenants with React Query
  const {
    data: tenants,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['tenants', searchQuery, isActiveFilter, minEndpoints, maxEndpoints],
    queryFn: () => tenantsService.getAll(buildFilters()),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    staleTime: 10000,
  });

  // Filter tenants locally if needed (backend search should handle most)
  const filteredTenants = Array.isArray(tenants) ? tenants : [];

  // Handle create tenant
  const handleCreateTenant = () => {
    setSelectedTenant(null);
    setIsFormOpen(true);
  };

  // Handle edit tenant
  const handleEditTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsFormOpen(true);
  };

  // Handle form success
  const handleFormSuccess = () => {
    refetch();
  };

  // Clear filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setIsActiveFilter('all');
    setMinEndpoints('');
    setMaxEndpoints('');
  };

  const hasActiveFilters = searchQuery || isActiveFilter !== 'all' || minEndpoints || maxEndpoints;

  return (
    <div className="h-full bg-background">
      <PageHeader
        title="Tenants"
        description="Gestion des organisations et locataires du call center"
        actions={
          canCreate && (
            <Button onClick={handleCreateTenant}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un tenant
            </Button>
          )
        }
      />

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Liste des Tenants</CardTitle>
                <CardDescription>
                  {filteredTenants.length} tenant(s) enregistré(s)
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
                  placeholder="Rechercher par nom, entreprise ou email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={hasActiveFilters ? 'border-primary' : ''}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtres
                {hasActiveFilters && (
                  <span className="ml-2 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    !
                  </span>
                )}
              </Button>
            </div>

            {/* Filters Section */}
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <CollapsibleContent className="space-y-4 mt-4 p-4 border rounded-lg bg-muted/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Status Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Statut</label>
                    <Select value={isActiveFilter} onValueChange={setIsActiveFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tous les statuts" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="active">Actifs</SelectItem>
                        <SelectItem value="inactive">Inactifs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Min Endpoints */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Min Endpoints</label>
                    <Input
                      type="number"
                      placeholder="Min"
                      value={minEndpoints}
                      onChange={(e) => setMinEndpoints(e.target.value)}
                      min="1"
                    />
                  </div>

                  {/* Max Endpoints */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Endpoints</label>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={maxEndpoints}
                      onChange={(e) => setMaxEndpoints(e.target.value)}
                      min="1"
                    />
                  </div>
                </div>

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFilters}
                    >
                      Effacer les filtres
                    </Button>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </CardHeader>

          <CardContent>
            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Chargement des tenants...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-12">
                <p className="text-destructive mb-4">
                  Erreur lors du chargement des tenants
                </p>
                <Button variant="outline" onClick={() => refetch()}>
                  Réessayer
                </Button>
              </div>
            )}

            {/* Tenants List */}
            {!isLoading && !error && filteredTenants && (
              <TenantsList
                tenants={filteredTenants}
                onEdit={handleEditTenant}
                onRefresh={() => refetch()}
              />
            )}

            {/* No Results */}
            {!isLoading && !error && filteredTenants.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchQuery || hasActiveFilters
                    ? 'Aucun tenant trouvé avec ces critères'
                    : 'Aucun tenant créé pour le moment'}
                </p>
                {canCreate && !searchQuery && !hasActiveFilters && (
                  <Button
                    onClick={handleCreateTenant}
                    className="mt-4"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Créer le premier tenant
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Tenant Form Modal */}
      <TenantFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        tenant={selectedTenant}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
