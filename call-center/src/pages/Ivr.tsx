import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, RefreshCw, Radio, MapPin, FileAudio } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/layout/PageHeader';

import IvrMenusList from '@/components/ivr/IvrMenusList';
import IvrMenuFormModal from '@/components/ivr/IvrMenuFormModal';
import IvrDidMappingsTable from '@/components/ivr/IvrDidMappingsTable';

import ivrService, { type IvrMenuEnriched, type IvrDidMapping } from '@/api/ivr';
import { UserRole } from '@/api/auth';
import useAuthStore from '@/store/authStore';

export default function Ivr() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuFormOpen, setIsMenuFormOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<IvrMenuEnriched | null>(null);
  const [activeTab, setActiveTab] = useState('menus');

  // Get user from store
  const { user } = useAuthStore();

  // Check if user can create (ADMIN or TENANT_ADMIN)
  const canCreate = user && (
    user.role === UserRole.ADMIN ||
    user.role === UserRole.TENANT_ADMIN
  );

  // Fetch enriched menus with React Query
  const {
    data: menus,
    isLoading: isLoadingMenus,
    error: menusError,
    refetch: refetchMenus,
  } = useQuery({
    queryKey: ['ivr', 'menus', 'enriched'],
    queryFn: () => ivrService.getMenusEnriched(),
    staleTime: 2 * 60 * 1000,
  });

  // Fetch DID mappings
  const {
    data: didMappings,
    isLoading: isLoadingDids,
    error: didsError,
    refetch: refetchDids,
  } = useQuery({
    queryKey: ['ivr', 'did-mappings'],
    queryFn: () => ivrService.getAllDidMappings(),
    staleTime: 2 * 60 * 1000,
  });

  // Fetch audio files
  const {
    data: audioFiles,
    isLoading: isLoadingAudio,
    refetch: refetchAudio,
  } = useQuery({
    queryKey: ['ivr', 'audio'],
    queryFn: () => ivrService.getAllAudioFiles(),
    staleTime: 5 * 60 * 1000,
  });

  // Filter menus by search query
  const filteredMenus = Array.isArray(menus)
    ? menus.filter((menu) => {
        if (!searchQuery) return true;

        const query = searchQuery.toLowerCase();
        return (
          menu.name.toLowerCase().includes(query) ||
          (menu.description && menu.description.toLowerCase().includes(query))
        );
      })
    : [];

  // Handle create menu
  const handleCreateMenu = () => {
    setSelectedMenu(null);
    setIsMenuFormOpen(true);
  };

  // Handle edit menu
  const handleEditMenu = (menu: IvrMenuEnriched) => {
    setSelectedMenu(menu);
    setIsMenuFormOpen(true);
  };

  // Handle menu form success
  const handleMenuFormSuccess = () => {
    refetchMenus();
  };

  // Calculate stats
  const totalMenus = menus?.length || 0;
  const activeMenus = menus?.filter((m) => m.isActive).length || 0;
  const totalDids = didMappings?.length || 0;
  const activeDids = didMappings?.filter((d) => d.isActive).length || 0;
  const totalOptions = menus?.reduce((sum, menu) => sum + (menu.optionsCount || 0), 0) || 0;

  return (
    <div className="h-full bg-background">
      <PageHeader
        title="Menus IVR"
        description="Gestion des menus IVR interactifs et routage des appels"
        actions={
          canCreate && activeTab === 'menus' && (
            <Button onClick={handleCreateMenu}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un menu
            </Button>
          )
        }
      />

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Menus */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Menus IVR</CardTitle>
              <Radio className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMenus}</div>
              <p className="text-xs text-muted-foreground">
                {activeMenus} actif(s) • {totalOptions} options
              </p>
            </CardContent>
          </Card>

          {/* Total DIDs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">DIDs mappés</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDids}</div>
              <p className="text-xs text-muted-foreground">
                {activeDids} actif(s)
              </p>
            </CardContent>
          </Card>

          {/* Audio Files */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fichiers audio</CardTitle>
              <FileAudio className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{audioFiles?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                {audioFiles
                  ? `${ivrService.formatFileSize(
                      audioFiles.reduce((sum, file) => sum + file.fileSize, 0)
                    )} total`
                  : 'Chargement...'}
              </p>
            </CardContent>
          </Card>

          {/* Coverage */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Couverture</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalMenus > 0 ? Math.round((activeDids / totalMenus) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                DIDs / Menus
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Content */}
        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="menus">Menus IVR</TabsTrigger>
                  <TabsTrigger value="dids">Mappings DID</TabsTrigger>
                  <TabsTrigger value="audio">Fichiers audio</TabsTrigger>
                </TabsList>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    refetchMenus();
                    refetchDids();
                    refetchAudio();
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {/* Tab 1: Menus */}
              <TabsContent value="menus" className="space-y-4 mt-0">
                <div>
                  <CardTitle>Liste des menus IVR</CardTitle>
                  <CardDescription>
                    {filteredMenus.length} menu(s) configuré(s)
                  </CardDescription>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom ou description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <CardContent className="p-0">
                  {/* Loading State */}
                  {isLoadingMenus && (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Chargement des menus...</p>
                    </div>
                  )}

                  {/* Error State */}
                  {menusError && (
                    <div className="text-center py-12">
                      <p className="text-destructive mb-4">
                        Erreur lors du chargement des menus
                      </p>
                      <Button variant="outline" onClick={() => refetchMenus()}>
                        Réessayer
                      </Button>
                    </div>
                  )}

                  {/* Menus List */}
                  {!isLoadingMenus && !menusError && filteredMenus.length > 0 && (
                    <IvrMenusList
                      menus={filteredMenus}
                      onEdit={handleEditMenu}
                      onRefresh={() => refetchMenus()}
                    />
                  )}

                  {/* No Menus */}
                  {!isLoadingMenus && !menusError && filteredMenus.length === 0 && menus && menus.length > 0 && (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">
                        Aucun menu trouvé avec ces critères
                      </p>
                    </div>
                  )}

                  {/* No Menus at all */}
                  {!isLoadingMenus && !menusError && menus?.length === 0 && (
                    <div className="text-center py-12">
                      <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">
                        Aucun menu IVR créé pour le moment
                      </p>
                      {canCreate && (
                        <Button onClick={handleCreateMenu}>
                          <Plus className="h-4 w-4 mr-2" />
                          Créer le premier menu
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </TabsContent>

              {/* Tab 2: DID Mappings */}
              <TabsContent value="dids" className="space-y-4 mt-0">
                <div>
                  <CardTitle>Mappings DID vers Menus</CardTitle>
                  <CardDescription>
                    Configuration du routage des numéros entrants vers les menus IVR
                  </CardDescription>
                </div>

                <CardContent className="p-0">
                  {/* Loading State */}
                  {isLoadingDids && (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Chargement des mappings...</p>
                    </div>
                  )}

                  {/* Error State */}
                  {didsError && (
                    <div className="text-center py-12">
                      <p className="text-destructive mb-4">
                        Erreur lors du chargement des mappings
                      </p>
                      <Button variant="outline" onClick={() => refetchDids()}>
                        Réessayer
                      </Button>
                    </div>
                  )}

                  {/* DID Mappings Table */}
                  {!isLoadingDids && !didsError && didMappings && (
                    <IvrDidMappingsTable
                      mappings={didMappings}
                      onRefresh={() => refetchDids()}
                    />
                  )}
                </CardContent>
              </TabsContent>

              {/* Tab 3: Audio Files */}
              <TabsContent value="audio" className="space-y-4 mt-0">
                <div>
                  <CardTitle>Bibliothèque de fichiers audio</CardTitle>
                  <CardDescription>
                    Gestion des fichiers audio utilisés dans les menus IVR
                  </CardDescription>
                </div>

                <CardContent className="p-0">
                  {/* Loading State */}
                  {isLoadingAudio && (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Chargement des fichiers...</p>
                    </div>
                  )}

                  {/* Audio Files List */}
                  {!isLoadingAudio && audioFiles && audioFiles.length > 0 && (
                    <div className="space-y-2">
                      {audioFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <FileAudio className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{file.name}</p>
                              {file.description && (
                                <p className="text-sm text-muted-foreground">{file.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{ivrService.formatDuration(file.duration)}</span>
                            <span>{ivrService.formatFileSize(file.fileSize)}</span>
                            <span className="font-mono text-xs">{file.filename}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* No Audio Files */}
                  {!isLoadingAudio && audioFiles?.length === 0 && (
                    <div className="text-center py-12">
                      <FileAudio className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">
                        Aucun fichier audio uploadé pour le moment
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Les fichiers audio peuvent être gérés via l'API ou le système de fichiers Asterisk
                      </p>
                    </div>
                  )}
                </CardContent>
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>
      </main>

      {/* Menu Form Modal */}
      <IvrMenuFormModal
        open={isMenuFormOpen}
        onOpenChange={setIsMenuFormOpen}
        menu={selectedMenu}
        onSuccess={handleMenuFormSuccess}
      />
    </div>
  );
}
