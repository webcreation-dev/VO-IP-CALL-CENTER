import React, { useEffect } from 'react';
import { Phone, PhoneIncoming, PhoneOutgoing, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/layout/PageHeader';
import useAuthStore from '@/store/authStore';
import useMonitoringStore from '@/store/monitoringStore';

const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { stats, isConnected, connectionState, subscribeToDashboard } = useMonitoringStore();

  useEffect(() => {
    if (isConnected && user?.tenantId) {
      subscribeToDashboard(user.tenantId);
    }
  }, [isConnected, user?.tenantId, subscribeToDashboard]);

  // Status for WebSocket connection
  const statusLabel =
    connectionState === 'connected' ? 'Connecté' :
    connectionState === 'connecting' ? 'Connexion...' :
    'Déconnecté';

  return (
    <div className="h-full bg-background">
      <PageHeader
        title="Dashboard"
        description="Vue d'ensemble de votre call center"
        status={{
          state: connectionState,
          label: statusLabel,
        }}
      />

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Appels Actifs
              </CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeCalls}</div>
              <p className="text-xs text-muted-foreground">
                En cours maintenant
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                En Attente
              </CardTitle>
              <PhoneIncoming className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.waitingCalls}</div>
              <p className="text-xs text-muted-foreground">
                Dans les files d'attente
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Appels Complétés
              </CardTitle>
              <PhoneOutgoing className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedCalls}</div>
              <p className="text-xs text-muted-foreground">
                Aujourd'hui
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Temps d'Attente Moy.
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(stats.avgWaitTime)}s
              </div>
              <p className="text-xs text-muted-foreground">
                Moyenne du jour
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Queues Status */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Files d'Attente</CardTitle>
              <CardDescription>
                État en temps réel des files d'attente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground text-center py-8">
                  Les données des files d'attente apparaîtront ici
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Agent Status */}
          <Card>
            <CardHeader>
              <CardTitle>Agents</CardTitle>
              <CardDescription>
                État des agents connectés
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground text-center py-8">
                  Les données des agents apparaîtront ici
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;