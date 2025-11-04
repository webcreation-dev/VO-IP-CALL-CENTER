import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  Building2,
  Users,
  Phone,
  PhoneIncoming,
  Radio,
  GitBranch,
  ListTree,
  FileAudio,
  PhoneCall,
  History,
  Activity,
  BarChart3,
  Settings,
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const navigation: NavItem[] = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Tenants',
    path: '/tenants',
    icon: Building2,
    roles: ['SUPER_ADMIN'],
  },
  {
    name: 'Utilisateurs',
    path: '/users',
    icon: Users,
    roles: ['SUPER_ADMIN', 'TENANT_ADMIN'],
  },
  {
    name: 'Contextes',
    path: '/contexts',
    icon: GitBranch,
  },
  {
    name: 'Endpoints SIP',
    path: '/endpoints',
    icon: Phone,
  },
  {
    name: 'Files d\'attente',
    path: '/queues',
    icon: PhoneIncoming,
  },
  {
    name: 'Extensions',
    path: '/extensions',
    icon: ListTree,
  },
  {
    name: 'IVR',
    path: '/ivr',
    icon: Radio,
  },
  {
    name: 'Canaux actifs',
    path: '/channels',
    icon: PhoneCall,
  },
  {
    name: 'CDR',
    path: '/cdr',
    icon: History,
  },
  {
    name: 'Enregistrements',
    path: '/recordings',
    icon: FileAudio,
  },
  {
    name: 'Monitoring',
    path: '/monitoring',
    icon: Activity,
  },
  {
    name: 'Statistiques',
    path: '/statistics',
    icon: BarChart3,
  },
];

export default function Sidebar() {
  const location = useLocation();
  const { user, hasRole } = useAuth();

  // Filtrer les items de navigation selon les rôles
  const filteredNavigation = navigation.filter(item => {
    if (!item.roles) return true; // Pas de restrictions de rôle
    return item.roles.some(role => hasRole(role));
  });

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  return (
    <div className="h-full bg-gray-900 w-64 flex flex-col">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
            <Phone className="w-6 h-6 text-white" />
          </div>
          <div className="text-white">
            <h1 className="text-lg font-bold">Call Center</h1>
            <p className="text-xs text-gray-400">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.username}</p>
            <p className="text-xs text-gray-400 truncate">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-3 space-y-1">
          {filteredNavigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                  ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }
                `}
              >
                <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Settings */}
      <div className="p-4 border-t border-gray-800">
        <Link
          to="/settings"
          className="flex items-center px-3 py-2 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
        >
          <Settings className="mr-3 h-5 w-5 flex-shrink-0" />
          <span>Paramètres</span>
        </Link>
      </div>
    </div>
  );
}
