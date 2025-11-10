import { NavLink } from 'react-router-dom';
import { Home, Users, Building2, Layers, PhoneCall, ListOrdered, Code2, Radio, Network, BarChart3, Shield, FileText, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import useAuthStore from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/api/auth';

const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: Home,
    roles: ['admin', 'tenant_admin', 'supervisor', 'agent'], // All roles
  },
  {
    name: 'Agents',
    href: '/agents',
    icon: Users,
    roles: ['admin', 'tenant_admin', 'supervisor'], // Management roles
  },
  {
    name: 'Tenants',
    href: '/tenants',
    icon: Building2,
    roles: ['admin'], // ADMIN only
  },
  {
    name: 'Contextes',
    href: '/contexts',
    icon: Layers,
    roles: ['admin', 'tenant_admin'], // Admin roles
  },
  {
    name: 'Files d\'attente',
    href: '/queues',
    icon: ListOrdered,
    roles: ['admin', 'tenant_admin', 'supervisor'], // Management roles
  },
  {
    name: 'Extensions',
    href: '/extensions',
    icon: Code2,
    roles: ['admin', 'tenant_admin'], // Admin roles
  },
  {
    name: 'IVR',
    href: '/ivr',
    icon: Radio,
    roles: ['admin', 'tenant_admin'], // Admin roles
  },
  {
    name: 'Interconnexions',
    href: '/trunks',
    icon: Network,
    roles: ['admin'], // ADMIN only
  },
  {
    name: 'Appels',
    href: '/calls',
    icon: PhoneCall,
    roles: ['admin', 'tenant_admin', 'supervisor', 'agent'], // All roles
  },
  {
    name: 'Rôles',
    href: '/roles',
    icon: Shield,
    roles: ['admin', 'tenant_admin'], // Admin roles
  },
  {
    name: 'Logs d\'Audit',
    href: '/audit-logs',
    icon: FileText,
    roles: ['admin', 'tenant_admin', 'supervisor'], // Management roles
  },
  {
    name: 'Rapports',
    href: '/reports',
    icon: BarChart3,
    roles: ['admin', 'tenant_admin', 'supervisor'], // Management roles
  },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter((item) => {
    if (!user) return false;
    return item.roles.includes(user.role);
  });

  return (
    <div className="flex flex-col h-full bg-card border-r">
      {/* Logo / Brand */}
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold text-foreground">Call Center</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Admin
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t space-y-4">
        <div className="px-3">
          <p className="text-sm font-medium text-foreground">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Rôle: {user?.role}
          </p>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={logout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
}
