import { create } from 'zustand';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  timestamp: number;
}

interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;

  // Theme
  theme: 'light' | 'dark' | 'system';

  // Notifications
  notifications: Notification[];

  // Loading states
  globalLoading: boolean;
  loadingMessage: string | null;

  // Modals
  activeModal: string | null;
  modalData: any;

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  setGlobalLoading: (loading: boolean, message?: string) => void;

  openModal: (modalId: string, data?: any) => void;
  closeModal: () => void;

  // Helper notification methods
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
}

const useUIStore = create<UIState>((set, get) => ({
  // Initial state
  sidebarOpen: true,
  sidebarCollapsed: false,
  theme: 'light',
  notifications: [],
  globalLoading: false,
  loadingMessage: null,
  activeModal: null,
  modalData: null,

  // Sidebar actions
  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  setSidebarOpen: (open) => {
    set({ sidebarOpen: open });
  },

  toggleSidebarCollapsed: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed });
  },

  // Theme actions
  setTheme: (theme) => {
    set({ theme });

    // Apply theme to document
    const root = document.documentElement;
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Save to localStorage
    localStorage.setItem('theme', theme);
  },

  // Notification actions
  addNotification: (notification) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: Date.now(),
      duration: notification.duration || 5000
    };

    set((state) => ({
      notifications: [...state.notifications, newNotification]
    }));

    // Auto-remove after duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        get().removeNotification(id);
      }, newNotification.duration);
    }
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    }));
  },

  clearNotifications: () => {
    set({ notifications: [] });
  },

  // Loading actions
  setGlobalLoading: (loading, message?) => {
    set({
      globalLoading: loading,
      loadingMessage: message || null
    });
  },

  // Modal actions
  openModal: (modalId, data = null) => {
    set({
      activeModal: modalId,
      modalData: data
    });
  },

  closeModal: () => {
    set({
      activeModal: null,
      modalData: null
    });
  },

  // Helper notification methods
  showSuccess: (title, message) => {
    get().addNotification({ type: 'success', title, message });
  },

  showError: (title, message) => {
    get().addNotification({ type: 'error', title, message });
  },

  showWarning: (title, message) => {
    get().addNotification({ type: 'warning', title, message });
  },

  showInfo: (title, message) => {
    get().addNotification({ type: 'info', title, message });
  }
}));

// Initialize theme on app load
if (typeof window !== 'undefined') {
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' || 'system';
  useUIStore.getState().setTheme(savedTheme);
}

export default useUIStore;