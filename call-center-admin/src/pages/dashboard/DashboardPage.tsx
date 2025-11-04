import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { DashboardStats } from '@/types/api';
import {
  Building2,
  Phone,
  PhoneIncoming,
  PhoneCall,
  TrendingUp,
  Activity,
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await api.get<DashboardStats>('/statistics/dashboard');
      setStats(data as DashboardStats);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Tenants',
      value: stats?.tenants.total || 0,
      subtitle: `${stats?.tenants.active || 0} actifs`,
      icon: Building2,
      color: 'bg-blue-500',
      change: '+12%',
    },
    {
      title: 'Endpoints',
      value: stats?.endpoints.total || 0,
      subtitle: `${stats?.endpoints.online || 0} en ligne`,
      icon: Phone,
      color: 'bg-green-500',
      change: '+5%',
    },
    {
      title: 'Files d\'attente',
      value: stats?.queues.total || 0,
      subtitle: `${stats?.queues.activeCalls || 0} appels en cours`,
      icon: PhoneIncoming,
      color: 'bg-purple-500',
      change: '-2%',
    },
    {
      title: 'Appels aujourd\'hui',
      value: stats?.calls.today || 0,
      subtitle: `${stats?.calls.answered || 0} répondus`,
      icon: PhoneCall,
      color: 'bg-orange-500',
      change: '+18%',
    },
    {
      title: 'Canaux actifs',
      value: stats?.channels.active || 0,
      subtitle: 'En temps réel',
      icon: Activity,
      color: 'bg-red-500',
      change: '',
    },
    {
      title: 'Durée moyenne',
      value: `${Math.floor((stats?.calls.averageDuration || 0) / 60)}m`,
      subtitle: 'Par appel',
      icon: TrendingUp,
      color: 'bg-indigo-500',
      change: '+8%',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bienvenue sur votre dashboard</h1>
        <p className="text-gray-600 mt-2">Vue d'ensemble de votre système de call center</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{card.subtitle}</p>
                  {card.change && (
                    <div className="flex items-center mt-2">
                      <span
                        className={`text-sm font-medium ${
                          card.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {card.change}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">vs hier</span>
                    </div>
                  )}
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="flex items-center justify-center px-4 py-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium">
            <Phone className="w-5 h-5 mr-2" />
            Nouvel Endpoint
          </button>
          <button className="flex items-center justify-center px-4 py-3 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors font-medium">
            <PhoneIncoming className="w-5 h-5 mr-2" />
            Nouvelle Queue
          </button>
          <button className="flex items-center justify-center px-4 py-3 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors font-medium">
            <Activity className="w-5 h-5 mr-2" />
            Voir les canaux
          </button>
          <button className="flex items-center justify-center px-4 py-3 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors font-medium">
            <TrendingUp className="w-5 h-5 mr-2" />
            Statistiques
          </button>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Activité récente</h2>
        <div className="space-y-4">
          <div className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-0">
            <div className="flex-shrink-0 w-2 h-2 mt-2 bg-green-500 rounded-full"></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900">
                <span className="font-medium">Endpoint 101</span> s'est connecté
              </p>
              <p className="text-xs text-gray-500 mt-1">Il y a 5 minutes</p>
            </div>
          </div>
          <div className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-0">
            <div className="flex-shrink-0 w-2 h-2 mt-2 bg-blue-500 rounded-full"></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900">
                <span className="font-medium">Nouvel appel</span> dans la queue Support
              </p>
              <p className="text-xs text-gray-500 mt-1">Il y a 12 minutes</p>
            </div>
          </div>
          <div className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-0">
            <div className="flex-shrink-0 w-2 h-2 mt-2 bg-purple-500 rounded-full"></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900">
                <span className="font-medium">IVR Menu Principal</span> a été modifié
              </p>
              <p className="text-xs text-gray-500 mt-1">Il y a 1 heure</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
