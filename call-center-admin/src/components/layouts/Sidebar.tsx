/**
 * Sidebar Navigation Component
 * Adapts menu based on user role
 */

import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Phone,
  ListOrdered,
  PhoneCall,
  FileText,
  Mic,
  BarChart3,
  Building2,
  Settings,
  Headphones,
  UserCircle,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types/entities.types';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    icon: <LayoutDashboard size={20} />,
    path: '/dashboard',
    roles: [UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR, UserRole.AGENT],
  },
  {
    label: 'Tenants',
    icon: <Building2 size={20} />,
    path: '/tenants',
    roles: [UserRole.SUPER_ADMIN],
  },
  {
    label: 'Endpoints',
    icon: <Phone size={20} />,
    path: '/endpoints',
    roles: [UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN],
  },
  {
    label: 'Queues',
    icon: <ListOrdered size={20} />,
    path: '/queues',
    roles: [UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR],
  },
  {
    label: 'Appels',
    icon: <PhoneCall size={20} />,
    path: '/calls',
    roles: [UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR, UserRole.AGENT],
  },
  {
    label: 'CDR',
    icon: <FileText size={20} />,
    path: '/cdr',
    roles: [UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR],
  },
  {
    label: 'Enregistrements',
    icon: <Mic size={20} />,
    path: '/recordings',
    roles: [UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR],
  },
  {
    label: 'Statistiques',
    icon: <BarChart3 size={20} />,
    path: '/statistics',
    roles: [UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR],
  },
  {
    label: 'Équipe',
    icon: <Users size={20} />,
    path: '/team',
    roles: [UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR],
  },
  {
    label: 'Mon Statut',
    icon: <Headphones size={20} />,
    path: '/my-status',
    roles: [UserRole.AGENT],
  },
  {
    label: 'Paramètres',
    icon: <Settings size={20} />,
    path: '/settings',
    roles: [UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN],
  },
];

export const Sidebar = () => {
  const location = useLocation();
  const { role, hasRole } = useAuth();

  // Filter nav items based on user role
  const visibleItems = navItems.filter((item) => hasRole(item.roles));

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <PhoneCall size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Call Center</h1>
            <p className="text-xs text-gray-400">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <UserCircle size={16} />
          <span>{role}</span>
        </div>
      </div>
    </div>
  );
};
