import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, RefreshCw, Code2, Filter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/layout/PageHeader';

import ExtensionsList from '@/components/extensions/ExtensionsList';
import ExtensionFormModal from '@/components/extensions/ExtensionFormModal';

import extensionsService, { type Extension } from '@/api/extensions';
import { UserRole } from '@/api/auth';
import useAuthStore from '@/store/authStore';

export default function Extensions() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContext, setSelectedContext] = useState<string>('all');
  const [selectedApp, setSelectedApp] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedExtension, setSelectedExtension] = useState<Extension | null>(null);

  // Get user from store
  const { user } = useAuthStore();

  // Check if user can create extensions (ADMIN or TENANT_ADMIN or SUPER_ADMIN)
  const canCreate = user && (
    user.role === UserRole.SUPER_ADMIN ||
    user.role === UserRole.ADMIN ||
    user.role === UserRole.TENANT_ADMIN
  );

  // Fetch extensions with React Query
  const {
    data: extensions,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['extensions'],
    queryFn: () => extensionsService.getAll(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch unique contexts
  const { data: contexts } = useQuery({
    queryKey: ['extensions', 'contexts'],
    queryFn: () => extensionsService.getContexts(),
    staleTime: 5 * 60 * 1000,
  });

  // Filter extensions
  const filteredExtensions = Array.isArray(extensions)
    ? extensions.filter((extension) => {
        // Filter by context
        if (selectedContext !== 'all' && extension.context !== selectedContext) {
          return false;
        }

        // Filter by application
        if (selectedApp !== 'all' && extension.app !== selectedApp) {
          return false;
        }

        // Filter by search query
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            extension.exten.toLowerCase().includes(query) ||
            extension.context.toLowerCase().includes(query) ||
            extension.app.toLowerCase().includes(query) ||
            extension.appdata.toLowerCase().includes(query)
          );
        }

        return true;
      })
    : [];

  // Get unique apps from extensions
  const uniqueApps = Array.isArray(extensions)
    ? Array.from(new Set(extensions.map((ext) => ext.app))).sort()
    : [];

  // Handle create extension
  const handleCreateExtension = () => {
    setSelectedExtension(null);
    setIsFormOpen(true);
  };

  // Handle edit extension
  const handleEditExtension = (extension: Extension) => {
    setSelectedExtension(extension);
    setIsFormOpen(true);
  };

  // Handle form success
  const handleFormSuccess = () => {
    refetch();
  };

  // Count extensions by context
  const extensionsByContext = Array.isArray(extensions)
    ? extensionsService.groupByContext(extensions)
    : {};

  const totalContexts = Object.keys(extensionsByContext).length;

  return (
    <div className="h-full bg-background">
      <PageHeader
        title="Extensions & Dialplan"
        description="Gestion technique du dialplan Asterisk"
        actions={
          canCreate && (
            <Button onClick={handleCreateExtension}>
              <Plus className="h-4 w-4 mr-2" />
              Créer une extension
            </Button>
          )
        }
      />

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Stats Cards */}
        {extensions && extensions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Extensions */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Extensions</CardTitle>
                <Code2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{extensions.length}</div>
                <p className="text-xs text-muted-foreground">
                  Dans {totalContexts} contexte(s)
                </p>
              </CardContent>
            </Card>

            {/* Most Used App */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">App la plus utilisée</CardTitle>
                <Filter className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {uniqueApps.length > 0
                    ? (() => {
                        const appCounts = extensions.reduce((acc, ext) => {
                          acc[ext.app] = (acc[ext.app] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>);
                        const mostUsed = Object.entries(appCounts).sort(
                          ([, a], [, b]) => b - a
                        )[0];
                        return mostUsed ? mostUsed[0] : '-';
                      })()
                    : '-'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {uniqueApps.length} application(s) différente(s)
                </p>
              </CardContent>
            </Card>

            {/* Filtered Count */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Résultats affichés</CardTitle>
                <Search className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredExtensions.length}</div>
                <p className="text-xs text-muted-foreground">
                  {filteredExtensions.length === extensions.length
                    ? 'Tous les résultats'
                    : `Filtré(s) sur ${extensions.length}`}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Extensions List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Liste des Extensions</CardTitle>
                <CardDescription>
                  {filteredExtensions.length} extension(s) • Groupées par contexte
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

            {/* Filters */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mt-4">
              {/* Search Bar */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par extension, contexte, app ou arguments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Context Filter */}
              <div className="w-full md:w-[200px]">
                <Select value={selectedContext} onValueChange={setSelectedContext}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les contextes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les contextes</SelectItem>
                    {contexts?.map((context) => (
                      <SelectItem key={context} value={context}>
                        {context}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Application Filter */}
              <div className="w-full md:w-[200px]">
                <Select value={selectedApp} onValueChange={setSelectedApp}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les apps" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les apps</SelectItem>
                    {uniqueApps.map((app) => (
                      <SelectItem key={app} value={app}>
                        {app}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Chargement des extensions...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-12">
                <p className="text-destructive mb-4">
                  Erreur lors du chargement des extensions
                </p>
                <Button variant="outline" onClick={() => refetch()}>
                  Réessayer
                </Button>
              </div>
            )}

            {/* Extensions List */}
            {!isLoading && !error && filteredExtensions.length > 0 && (
              <ExtensionsList
                extensions={filteredExtensions}
                onEdit={handleEditExtension}
                onRefresh={() => refetch()}
                groupByContext={selectedContext === 'all'}
              />
            )}

            {/* No Results */}
            {!isLoading &&
              !error &&
              filteredExtensions.length === 0 &&
              extensions &&
              extensions.length > 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    Aucune extension trouvée avec ces critères
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedContext('all');
                      setSelectedApp('all');
                    }}
                    className="mt-4"
                  >
                    Réinitialiser les filtres
                  </Button>
                </div>
              )}

            {/* No Extensions at all */}
            {!isLoading && !error && extensions?.length === 0 && (
              <div className="text-center py-12">
                <Code2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Aucune extension créée pour le moment
                </p>
                {canCreate && (
                  <Button onClick={handleCreateExtension}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer la première extension
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Extension Form Modal */}
      <ExtensionFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        extension={selectedExtension}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
