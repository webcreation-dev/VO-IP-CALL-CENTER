import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import authService, { type User, type LoginRequest, UserRole } from '../api/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isHydrated: boolean;

  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  hasRole: (roles: UserRole[]) => boolean;
  isAdmin: () => boolean;
  isSupervisor: () => boolean;
  getTenantId: () => number | null;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: authService.getStoredUser(),
      token: localStorage.getItem('access_token'),
      isAuthenticated: authService.isAuthenticated(),
      isLoading: false,
      error: null,
      isHydrated: false,

      // Login action
      login: async (credentials) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authService.login(credentials);

          // Store token in localStorage for Axios interceptor
          localStorage.setItem('access_token', response.accessToken);
          localStorage.setItem('user', JSON.stringify(response.user));

          set({
            user: response.user,
            token: response.accessToken,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
        } catch (error: any) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.response?.data?.error?.message || 'Login failed'
          });
          throw error;
        }
      },

      // Logout action
      logout: () => {
        authService.logout();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
      },

      // Refresh user profile
      refreshUser: async () => {
        set({ isLoading: true });

        try {
          const user = await authService.getCurrentUser();
          set({
            user,
            isLoading: false,
            error: null
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.response?.data?.error?.message || 'Failed to refresh user'
          });
          throw error;
        }
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Check if user has specific roles
      hasRole: (roles) => {
        const { user } = get();
        if (!user) return false;
        return roles.includes(user.role);
      },

      // Check if user is admin
      isAdmin: () => {
        return get().hasRole([
          UserRole.ADMIN,
          UserRole.TENANT_ADMIN
        ]);
      },

      // Check if user is supervisor or higher
      isSupervisor: () => {
        return get().hasRole([
          UserRole.ADMIN,
          UserRole.TENANT_ADMIN,
          UserRole.SUPERVISOR
        ]);
      },

      // Get tenant ID
      getTenantId: () => {
        const { user } = get();
        return user?.tenantId || null;
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;

          // Sync token to localStorage after rehydration for Axios interceptor
          if (state.token) {
            localStorage.setItem('access_token', state.token);
          }
          if (state.user) {
            localStorage.setItem('user', JSON.stringify(state.user));
          }
        }
      }
    }
  )
);

export default useAuthStore;