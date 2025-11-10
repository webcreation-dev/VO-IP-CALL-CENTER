import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Pages
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Agents from '@/pages/Agents';
import Tenants from '@/pages/Tenants';
import Contexts from '@/pages/Contexts';
import Queues from '@/pages/Queues';
import Extensions from '@/pages/Extensions';
import Ivr from '@/pages/Ivr';
import Trunks from '@/pages/Trunks';
import Calls from '@/pages/Calls';
import Reports from '@/pages/Reports';
import Roles from '@/pages/Roles';
import AuditLogs from '@/pages/AuditLogs';

// Components
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import MainLayout from '@/components/layout/MainLayout';
import { Toaster } from '@/components/ui/toaster';

// Store
import useAuthStore from '@/store/authStore';
import useMonitoringStore from '@/store/monitoringStore';

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
  },
});

function App() {
  const { isAuthenticated, getTenantId, isHydrated } = useAuthStore();
  const { connect, disconnect } = useMonitoringStore();

  // Wait for store to rehydrate from localStorage
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Connect to WebSocket when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const tenantId = getTenantId();
      if (tenantId) {
        connect(tenantId).catch(console.error);
      }
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, getTenantId, connect, disconnect]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/" replace /> : <Login />
          } />

          {/* Protected routes with layout */}
          <Route element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route path="/" element={<Dashboard />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/tenants" element={<Tenants />} />
            <Route path="/contexts" element={<Contexts />} />
            <Route path="/queues" element={<Queues />} />
            <Route path="/extensions" element={<Extensions />} />
            <Route path="/ivr" element={<Ivr />} />
            <Route path="/trunks" element={<Trunks />} />
            <Route path="/calls" element={<Calls />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/roles" element={<Roles />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
          </Route>

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Toast notifications */}
        <Toaster />
      </Router>
    </QueryClientProvider>
  );
}

export default App;