import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, RefreshCw, Layers } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/layout/PageHeader';

import ContextsList from '@/components/contexts/ContextsList';
import ContextFormModal from '@/components/contexts/ContextFormModal';

import contextsService, { type TenantContext } from '@/api/contexts';
import { UserRole } from '@/api/auth';
import useAuthStore from '@/store/authStore';

export default function Contexts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedContext, setSelectedContext] = useState<TenantContext | null>(null);

  // Get user from store
  const { user } = useAuthStore();

  // Check if user can create contexts (ADMIN or TENANT_ADMIN)
  const canCreate = user && (
    user.role === UserRole.SUPER_ADMIN ||
    user.role === UserRole.ADMIN ||
    user.role === UserRole.TENANT_ADMIN
  );

  // Fetch contexts with React Query
  const {
    data: contexts,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['contexts'],
    queryFn: () => contextsService.getAll(),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    staleTime: 10000,
  });

  // Filter contexts locally by search query
  const filteredContexts = Array.isArray(contexts)
    ? contexts.filter((context) => {
        if (!searchQuery) return true;

        const query = searchQuery.toLowerCase();
        const displayName = contextsService.getDisplayName(context).toLowerCase();
        const description = (context.description || '').toLowerCase();

        return (
          context.name.toLowerCase().includes(query) ||
          displayName.includes(query) ||
          description.includes(query)
        );
      })
    : [];

  // Handle create context
  const handleCreateContext = () => {
    setSelectedContext(null);
    setIsFormOpen(true);
  };

  // Handle edit context
  const handleEditContext = (context: TenantContext) => {
    setSelectedContext(context);
    setIsFormOpen(true);
  };

  // Handle form success
  const handleFormSuccess = () => {
    refetch();
  };

  return (
    <div className="h-full bg-background">
      <PageHeader
        title="Contextes"
        description="Gestion des contextes Asterisk pour l'organisation des appels"
        actions={
          canCreate && (
            <Button onClick={handleCreateContext}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un contexte
            </Button>
          )
        }
      />

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Liste des Contextes</CardTitle>
                <CardDescription>
                  {filteredContexts.length} contexte(s) enregistré(s)
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

            {/* Info Message */}
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-3">
                <Layers className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    À propos des contextes
                  </p>
                  <p className="text-blue-700 dark:text-blue-300 mt-1">
                    Le <strong>contexte principal</strong> est créé automatiquement pour chaque tenant et ne peut pas être supprimé.
                    Vous pouvez créer des contextes secondaires pour organiser vos extensions et routes d'appel selon vos besoins (ex: sales, support, technique).
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Chargement des contextes...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-12">
                <p className="text-destructive mb-4">
                  Erreur lors du chargement des contextes
                </p>
                <Button variant="outline" onClick={() => refetch()}>
                  Réessayer
                </Button>
              </div>
            )}

            {/* Contexts List */}
            {!isLoading && !error && filteredContexts && (
              <ContextsList
                contexts={filteredContexts}
                onEdit={handleEditContext}
                onRefresh={() => refetch()}
              />
            )}

            {/* No Results */}
            {!isLoading && !error && filteredContexts.length === 0 && contexts && contexts.length > 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Aucun contexte trouvé avec ces critères
                </p>
              </div>
            )}

            {/* No Contexts at all */}
            {!isLoading && !error && contexts?.length === 0 && (
              <div className="text-center py-12">
                <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Aucun contexte disponible
                </p>
                <p className="text-sm text-muted-foreground">
                  Le contexte principal devrait être créé automatiquement.
                  Si ce n'est pas le cas, contactez l'administrateur système.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Context Form Modal */}
      <ContextFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        context={selectedContext}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
