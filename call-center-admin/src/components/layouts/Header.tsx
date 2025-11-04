/**
 * Header Component
 * Displays user info, notifications, and logout
 */

import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { LogOut, Bell, ChevronDown } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { logout } from '../../store/slices/authSlice';
import { toast } from 'sonner';
import { getInitials } from '../../utils/formatters';
import { ROLE_LABELS } from '../../utils/constants';

export const Header = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, role } = useAuth();

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Déconnexion réussie');
    navigate('/login');
  };

  const initials = user
    ? getInitials(user.firstName || '', user.lastName || '')
    : '??';

  const roleName = role ? ROLE_LABELS[role] || role : 'Unknown';

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - could add breadcrumbs here */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            {/* This can be dynamic based on current route */}
          </h2>
        </div>

        {/* Right side - User menu */}
        <div className="flex items-center space-x-4">
          {/* Notifications (placeholder) */}
          <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">
            <Bell size={20} />
            {/* Notification badge */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User menu */}
          <div className="flex items-center space-x-3 border-l border-gray-200 pl-4">
            {/* Avatar */}
            <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
              {initials}
            </div>

            {/* User info */}
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="text-xs text-gray-500">{roleName}</span>
            </div>

            {/* Dropdown button (future implementation) */}
            <button className="p-1 text-gray-600 hover:text-gray-900">
              <ChevronDown size={16} />
            </button>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Se déconnecter"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
