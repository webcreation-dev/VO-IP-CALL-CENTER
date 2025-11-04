import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, Bell } from 'lucide-react';

const pageNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/tenants': 'Gestion des Tenants',
  '/users': 'Gestion des Utilisateurs',
  '/contexts': 'Contextes',
  '/endpoints': 'Endpoints SIP',
  '/queues': 'Files d\'attente',
  '/extensions': 'Extensions & Dialplan',
  '/ivr': 'Configuration IVR',
  '/channels': 'Canaux actifs',
  '/cdr': 'Historique des appels (CDR)',
  '/recordings': 'Enregistrements',
  '/monitoring': 'Monitoring temps réel',
  '/statistics': 'Statistiques',
  '/settings': 'Paramètres',
};

export default function Header() {
  const location = useLocation();
  const { logout, user } = useAuth();

  // Obtenir le nom de la page actuelle
  const getPageName = () => {
    // Chercher une correspondance exacte
    if (pageNames[location.pathname]) {
      return pageNames[location.pathname];
    }

    // Chercher une correspondance partielle (pour les sous-routes)
    for (const [path, name] of Object.entries(pageNames)) {
      if (location.pathname.startsWith(path)) {
        return name;
      }
    }

    return 'Page';
  };

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6">
      {/* Titre de la page */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{getPageName()}</h2>
        {user?.tenantId && (
          <p className="text-sm text-gray-500">Tenant ID: {user.tenantId}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <button
          className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Informations utilisateur */}
        <div className="flex items-center space-x-3 px-3 py-2 bg-gray-50 rounded-lg">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{user?.username}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Bouton de déconnexion */}
        <button
          onClick={logout}
          className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Se déconnecter"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Déconnexion</span>
        </button>
      </div>
    </header>
  );
}
