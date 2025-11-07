import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Phone, PhoneCall, ListOrdered, Activity, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/layout/PageHeader';
import ActiveCallsTable from '@/components/calls/ActiveCallsTable';
import OriginateCallDialog from '@/components/calls/OriginateCallDialog';
import TransferDialog from '@/components/calls/TransferDialog';
import QueueCallsTable from '@/components/calls/QueueCallsTable';
import useAuthStore from '@/store/authStore';
import useCallsWebSocket from '@/hooks/useCallsWebSocket';
import callsService, { type Channel, ChannelState, type ChannelFilterDto, CHANNEL_STATES } from '@/api/calls';

export default function Calls() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState<ChannelState | 'all'>('all');
  const [originateDialogOpen, setOriginateDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  // ========================================
  // WebSocket for Real-Time Updates
  // ========================================

  const { connected, dashboardStats } = useCallsWebSocket();

  // ========================================
  // Permissions
  // ========================================

  const canOriginate = user ? callsService.canOriginate(user.role) : false;

  // ========================================
  // Load Active Channels
  // ========================================

  const buildFilters = (): ChannelFilterDto => {
    const filters: ChannelFilterDto = {};
    if (stateFilter !== 'all') {
      filters.state = stateFilter as ChannelState;
    }
    if (searchTerm) {
      filters.callerId = searchTerm;
    }
    return filters;
  };

  const {
    data: channels = [],
    isLoading: loadingChannels,
    refetch: refetchChannels,
  } = useQuery({
    queryKey: ['channels', stateFilter, searchTerm],
    queryFn: () => callsService.getAllChannels(buildFilters()),
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    staleTime: 3000,
  });

  // ========================================
  // Event Handlers
  // ========================================

  const handleTransfer = (channel: Channel) => {
    setSelectedChannel(channel);
    setTransferDialogOpen(true);
  };

  const handleRefresh = () => {
    refetchChannels();
  };

  const handleOriginateSuccess = () => {
    setTimeout(() => {
      refetchChannels();
    }, 1000);
  };

  const handleTransferSuccess = () => {
    setTimeout(() => {
      refetchChannels();
    }, 1000);
  };

  // ========================================
  // Stats Cards
  // ========================================

  const renderStats = () => {
    const activeChannelsCount = dashboardStats?.activeChannels || channels.length;
    const activeCallsCount = dashboardStats?.activeCalls || channels.filter(c => c.state === ChannelState.UP).length;
    const ringingCount = channels.filter(c => c.state === ChannelState.RINGING || c.state === ChannelState.RING).length;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Canaux Actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{activeChannelsCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Appels en Cours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{activeCallsCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Appels Entrants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold">{ringingCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Connexion Temps Réel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium">
                {connected ? 'Connecté' : 'Déconnecté'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ========================================
  // Render
  // ========================================

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des Appels"
        description="Surveillez et gérez les appels actifs en temps réel"
        actions={
          canOriginate ? (
            <Button onClick={() => setOriginateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Appel
            </Button>
          ) : undefined
        }
      />

      {renderStats()}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            <Phone className="h-4 w-4 mr-2" />
            Appels Actifs
          </TabsTrigger>
          <TabsTrigger value="queues">
            <ListOrdered className="h-4 w-4 mr-2" />
            Files d'Attente
          </TabsTrigger>
        </TabsList>

        {/* Active Calls Tab */}
        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Canaux Actifs</CardTitle>
                  <CardDescription>
                    Liste de tous les canaux actifs avec contrôles en temps réel
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualiser
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Rechercher par numéro..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select
                  value={stateFilter}
                  onValueChange={(value) => setStateFilter(value as ChannelState | 'all')}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filtrer par état" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les états</SelectItem>
                    {CHANNEL_STATES.map((state) => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Channels Table */}
              {loadingChannels ? (
                <div className="text-center py-8 text-muted-foreground">
                  Chargement des appels...
                </div>
              ) : (
                <ActiveCallsTable
                  channels={channels}
                  onRefresh={refetchChannels}
                  onTransfer={handleTransfer}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Queue Calls Tab */}
        <TabsContent value="queues">
          <QueueCallsTable />
        </TabsContent>
      </Tabs>

      {/* Originate Call Dialog */}
      <OriginateCallDialog
        open={originateDialogOpen}
        onOpenChange={setOriginateDialogOpen}
        onSuccess={handleOriginateSuccess}
      />

      {/* Transfer Dialog */}
      <TransferDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        channel={selectedChannel}
        onSuccess={handleTransferSuccess}
      />
    </div>
  );
}
