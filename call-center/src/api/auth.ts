import apiClient, { type ApiResponse } from './config';

// User roles (matching backend format)
export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  TENANT_ADMIN: 'TENANT_ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  AGENT: 'AGENT'
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

// User interface
export interface User {
  id: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId?: number;
  endpointId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Login request
export interface LoginRequest {
  email: string;
  password: string;
}

// Login response
export interface LoginResponse {
  accessToken: string;
  user: User;
}

// Register request
export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId?: number;
  endpointId?: string;
}

class AuthService {
  // Login
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', credentials);

    if (response.data.success && response.data.data) {
      // Zustand persist middleware handles localStorage storage
      return response.data.data;
    }

    throw new Error('Login failed');
  }

  // Register (admin only)
  async register(userData: RegisterRequest): Promise<User> {
    const response = await apiClient.post<ApiResponse<User>>('/auth/register', userData);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Registration failed');
  }

  // Get current user profile
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>('/auth/me');

    if (response.data.success && response.data.data) {
      // Update stored user data
      localStorage.setItem('user', JSON.stringify(response.data.data));
      return response.data.data;
    }

    throw new Error('Failed to get user profile');
  }

  // Logout
  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  // Get stored user
  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  // Check if user has specific role
  hasRole(requiredRoles: UserRole[]): boolean {
    const user = this.getStoredUser();
    if (!user) return false;

    return requiredRoles.includes(user.role);
  }

  // Check if user is admin (any admin type)
  isAdmin(): boolean {
    return this.hasRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TENANT_ADMIN]);
  }

  // Check if user is supervisor or higher
  isSupervisor(): boolean {
    return this.hasRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR]);
  }
}

export default new AuthService();