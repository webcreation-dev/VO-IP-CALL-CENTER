import { NavLink } from 'react-router-dom';
import { Home, Users, Building2, Layers, PhoneCall, ListOrdered, Code2, Radio, BarChart3, Shield, FileText, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import useAuthStore from '@/store/authStore';
import { Button } from '@/components/ui/button';

const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: Home,
  },
  {
    name: 'Agents',
    href: '/agents',
    icon: Users,
  },
  {
    name: 'Tenants',
    href: '/tenants',
    icon: Building2,
  },
  {
    name: 'Contextes',
    href: '/contexts',
    icon: Layers,
  },
  {
    name: 'Files d\'attente',
    href: '/queues',
    icon: ListOrdered,
  },
  {
    name: 'Extensions',
    href: '/extensions',
    icon: Code2,
  },
  {
    name: 'IVR',
    href: '/ivr',
    icon: Radio,
  },
  {
    name: 'Appels',
    href: '/calls',
    icon: PhoneCall,
  },
  {
    name: 'Rôles',
    href: '/roles',
    icon: Shield,
  },
  {
    name: 'Logs d\'Audit',
    href: '/audit-logs',
    icon: FileText,
  },
  {
    name: 'Rapports',
    href: '/reports',
    icon: BarChart3,
  },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();

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
        {navigation.map((item) => {
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
