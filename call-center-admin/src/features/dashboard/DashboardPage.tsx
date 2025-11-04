/**
 * Dashboard Page
 * Main dashboard with KPIs and real-time stats
 */

import { useAuth } from '../../hooks/useAuth';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { StatsCard } from '../../components/common/StatsCard';
import { Phone, PhoneIncoming, PhoneOutgoing, Clock, Users, Headphones } from 'lucide-react';

export const DashboardPage = () => {
  const { user } = useAuth();

  // TODO: Replace with real data from API
  const stats = {
    totalCalls: 1247,
    activeCalls: 23,
    waitingCalls: 5,
    avgWaitTime: '2:34',
    activeAgents: 18,
    pausedAgents: 3,
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Bienvenue, {user?.firstName} !
          </h1>
          <p className="text-gray-600 mt-1">
            Voici un aperçu de votre activité aujourd'hui
          </p>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Total d'appels"
            value={stats.totalCalls}
            icon={Phone}
            trend={{ value: 12, isPositive: true }}
            iconBgColor="bg-blue-100"
            iconColor="text-blue-600"
          />

          <StatsCard
            title="Appels actifs"
            value={stats.activeCalls}
            icon={PhoneIncoming}
            iconBgColor="bg-green-100"
            iconColor="text-green-600"
          />

          <StatsCard
            title="En attente"
            value={stats.waitingCalls}
            icon={Clock}
            iconBgColor="bg-yellow-100"
            iconColor="text-yellow-600"
          />

          <StatsCard
            title="Temps d'attente moyen"
            value={stats.avgWaitTime}
            icon={Clock}
            trend={{ value: -5, isPositive: true }}
            iconBgColor="bg-purple-100"
            iconColor="text-purple-600"
          />

          <StatsCard
            title="Agents actifs"
            value={stats.activeAgents}
            icon={Headphones}
            iconBgColor="bg-indigo-100"
            iconColor="text-indigo-600"
          />

          <StatsCard
            title="Agents en pause"
            value={stats.pausedAgents}
            icon={Users}
            iconBgColor="bg-orange-100"
            iconColor="text-orange-600"
          />
        </div>

        {/* Recent Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Calls */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Appels actifs
            </h2>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                      <PhoneIncoming size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">+33 1 23 45 67 89</p>
                      <p className="text-sm text-gray-500">Agent: John Doe</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-600">00:02:34</span>
                </div>
              ))}
            </div>
          </div>

          {/* Queue Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Statut des files
            </h2>
            <div className="space-y-3">
              {['Support', 'Ventes', 'Technique'].map((queue, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{queue}</p>
                    <p className="text-sm text-gray-500">
                      {Math.floor(Math.random() * 10)} agents disponibles
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {Math.floor(Math.random() * 5)}
                    </p>
                    <p className="text-xs text-gray-500">en attente</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
