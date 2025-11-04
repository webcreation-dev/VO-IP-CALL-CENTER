import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Layout
import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/components/layout/ProtectedRoute';

// Auth
import LoginPage from '@/pages/auth/LoginPage';

// Dashboard
import DashboardPage from '@/pages/dashboard/DashboardPage';

// Tenants
import TenantsPage from '@/pages/tenants/TenantsPage';

// Users
import UsersPage from '@/pages/users/UsersPage';

// Contexts
import ContextsPage from '@/pages/contexts/ContextsPage';

// Endpoints
import EndpointsPage from '@/pages/endpoints/EndpointsPage';

// Queues
import QueuesPage from '@/pages/queues/QueuesPage';

// Create QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Tenants - Super Admin only */}
            <Route
              path="/tenants"
              element={
                <ProtectedRoute requiredRole="SUPER_ADMIN">
                  <TenantsPage />
                </ProtectedRoute>
              }
            />

            {/* Users */}
            <Route
              path="/users"
              element={
                <ProtectedRoute requiredRole={['SUPER_ADMIN', 'TENANT_ADMIN']}>
                  <UsersPage />
                </ProtectedRoute>
              }
            />

            {/* Contexts */}
            <Route
              path="/contexts"
              element={<ContextsPage />}
            />

            {/* Endpoints */}
            <Route
              path="/endpoints"
              element={<EndpointsPage />}
            />

            {/* Queues */}
            <Route
              path="/queues"
              element={<QueuesPage />}
            />

            {/* Extensions */}
            <Route
              path="/extensions"
              element={
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold">Extensions & Dialplan</h2>
                  <p className="text-gray-600 mt-2">Module en cours de développement...</p>
                </div>
              }
            />

            {/* IVR */}
            <Route
              path="/ivr/*"
              element={
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold">Configuration IVR</h2>
                  <p className="text-gray-600 mt-2">Module en cours de développement...</p>
                </div>
              }
            />

            {/* Channels */}
            <Route
              path="/channels"
              element={
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold">Canaux actifs</h2>
                  <p className="text-gray-600 mt-2">Module en cours de développement...</p>
                </div>
              }
            />

            {/* CDR */}
            <Route
              path="/cdr"
              element={
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold">Historique des appels</h2>
                  <p className="text-gray-600 mt-2">Module en cours de développement...</p>
                </div>
              }
            />

            {/* Recordings */}
            <Route
              path="/recordings"
              element={
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold">Enregistrements</h2>
                  <p className="text-gray-600 mt-2">Module en cours de développement...</p>
                </div>
              }
            />

            {/* Monitoring */}
            <Route
              path="/monitoring"
              element={
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold">Monitoring temps réel</h2>
                  <p className="text-gray-600 mt-2">Module en cours de développement...</p>
                </div>
              }
            />

            {/* Statistics */}
            <Route
              path="/statistics"
              element={
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold">Statistiques</h2>
                  <p className="text-gray-600 mt-2">Module en cours de développement...</p>
                </div>
              }
            />

            {/* Settings */}
            <Route
              path="/settings"
              element={
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold">Paramètres</h2>
                  <p className="text-gray-600 mt-2">Module en cours de développement...</p>
                </div>
              }
            />
          </Route>

          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>

      {/* React Query Devtools */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
