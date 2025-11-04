import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import type { AppUser, LoginRequest, LoginResponse } from '@/types/api';

interface AuthState {
  user: AppUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const useAuth = () => {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Charger l'utilisateur depuis localStorage au montage
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        setAuthState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error) {
        console.error('Erreur lors du parsing du user:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setAuthState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } else {
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  // Login
  const login = useCallback(async (credentials: LoginRequest) => {
    try {
      const response = await api.post<LoginResponse>('/auth/login', credentials);

      const { access_token, user } = response as unknown as LoginResponse;

      // Sauvegarder dans localStorage
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));

      // Mettre à jour l'état
      setAuthState({
        user,
        token: access_token,
        isAuthenticated: true,
        isLoading: false,
      });

      // Rediriger vers le dashboard
      navigate('/dashboard');

      return { success: true };
    } catch (error: any) {
      console.error('Erreur de connexion:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Erreur de connexion',
      };
    }
  }, [navigate]);

  // Logout
  const logout = useCallback(() => {
    // Supprimer du localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Réinitialiser l'état
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });

    // Rediriger vers la page de login
    navigate('/login');
  }, [navigate]);

  // Récupérer le profil de l'utilisateur connecté
  const fetchProfile = useCallback(async () => {
    try {
      const user = await api.get<AppUser>('/auth/me');

      // Mettre à jour le user dans localStorage et state
      localStorage.setItem('user', JSON.stringify(user));
      setAuthState((prev) => ({
        ...prev,
        user: user as AppUser,
      }));

      return { success: true, user };
    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error);
      return { success: false, error };
    }
  }, []);

  // Vérifier si l'utilisateur a un rôle spécifique
  const hasRole = useCallback((role: string | string[]) => {
    if (!authState.user) return false;

    if (Array.isArray(role)) {
      return role.includes(authState.user.role);
    }

    return authState.user.role === role;
  }, [authState.user]);

  // Vérifier si l'utilisateur est admin
  const isAdmin = useCallback(() => {
    return hasRole(['SUPER_ADMIN', 'TENANT_ADMIN', 'ADMIN']);
  }, [hasRole]);

  // Vérifier si l'utilisateur est super admin
  const isSuperAdmin = useCallback(() => {
    return hasRole('SUPER_ADMIN');
  }, [hasRole]);

  return {
    user: authState.user,
    token: authState.token,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    login,
    logout,
    fetchProfile,
    hasRole,
    isAdmin,
    isSuperAdmin,
  };
};
