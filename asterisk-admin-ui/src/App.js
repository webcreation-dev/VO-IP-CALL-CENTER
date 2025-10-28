import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Phone,
  Headphones,
  FileText,
  BarChart3,
  Settings,
  Menu,
  X,
  Activity,
  PhoneCall,
  UserPlus,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Download,
  RefreshCw,
  Power,
  Clock,
  TrendingUp,
  PhoneMissed,
  Search,
  Filter,
  Calendar,
  Volume2,
  Database,
  Wifi,
  Zap,
  TrendingDown,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const API_BASE_URL = 'http://161.97.106.134:3000';

// Utility function for API calls
const apiCall = async (endpoint, method = 'GET', body = null) => {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || 'Erreur API');
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Stat Card Component with gradient and animation
const StatCard = ({ title, value, icon, color, trend }) => {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-orange-500',
    purple: 'from-purple-500 to-purple-600',
    red: 'from-red-500 to-red-600',
    orange: 'from-orange-500 to-orange-600',
  };

  return (
    <div className="relative overflow-hidden bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${colors[color]} opacity-5`}
      ></div>
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-4">
          <div
            className={`p-3 rounded-xl bg-gradient-to-br ${colors[color]} shadow-lg`}
          >
            <div className="text-white">{icon}</div>
          </div>
          {trend && (
            <div
              className={`flex items-center gap-1 text-sm font-semibold ${
                trend > 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {trend > 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <div>
          <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 tracking-tight">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
};

// Modal Component with enhanced design
const Modal = ({ children, onClose, title }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform animate-slideUp">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-3xl">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-xl transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// Login Component
const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = e => {
    e.preventDefault();
    if (username === 'kamgoko' && password === 'password') {
      localStorage.setItem('isAuthenticated', 'true');
      onLogin();
    } else {
      setError('Identifiants incorrects');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-96">
        <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          🎙️ Asterisk Admin
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Login
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
              required
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg font-semibold"
          >
            Se connecter
          </button>
        </form>
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await apiCall('/api/statistics/summary');
      setStats(data.data);
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 absolute top-0"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Tableau de Bord
          </h1>
          <p className="text-gray-500 mt-2">Vue d'ensemble de votre système</p>
        </div>
        <button
          onClick={loadDashboard}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all"
        >
          <RefreshCw className="w-5 h-5" />
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Appels Totaux"
          value={stats?.calls?.total || 0}
          icon={<PhoneCall className="w-8 h-8" />}
          color="blue"
          trend={12}
        />
        <StatCard
          title="Appels Répondus"
          value={stats?.calls?.answered || 0}
          icon={<TrendingUp className="w-8 h-8" />}
          color="green"
          trend={8}
        />
        <StatCard
          title="Taux de Réponse"
          value={`${stats?.calls?.answer_rate || 0}%`}
          icon={<Activity className="w-8 h-8" />}
          color="yellow"
          trend={5}
        />
        <StatCard
          title="Endpoints Actifs"
          value={stats?.endpoints || 0}
          icon={<Phone className="w-8 h-8" />}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Période Active</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
              <span className="text-gray-600 font-medium">Début</span>
              <span className="font-bold text-gray-900">
                {stats?.period?.start || '-'}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
              <span className="text-gray-600 font-medium">Fin</span>
              <span className="font-bold text-gray-900">
                {stats?.period?.end || '-'}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl">
              <span className="text-gray-600 font-medium">Files d'attente</span>
              <span className="font-bold text-gray-900">
                {stats?.queues || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-xl p-6 text-white hover:shadow-2xl transition-all">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-white bg-opacity-20 rounded-lg backdrop-blur">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold">Performance Globale</h3>
          </div>
          <div className="flex items-center justify-center h-40">
            <div className="text-center">
              <div className="text-7xl font-black mb-2 drop-shadow-lg">
                {stats?.calls?.answer_rate || 0}%
              </div>
              <div className="text-lg font-medium opacity-90">
                Taux de Réponse
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Tenants Management
const TenantsManager = () => {
  const [tenants, setTenants] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [formData, setFormData] = useState({ name: '' });

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const data = await apiCall('/api/tenants');
      setTenants(data.data);
    } catch (error) {
      alert('Erreur chargement tenants');
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      if (editingTenant) {
        await apiCall(`/api/tenants/${editingTenant.id}`, 'PUT', formData);
      } else {
        await apiCall('/api/tenants', 'POST', formData);
      }
      setShowModal(false);
      setFormData({ name: '' });
      setEditingTenant(null);
      loadTenants();
    } catch (error) {
      alert('Erreur lors de la sauvegarde: ' + error.message);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Supprimer ce tenant ?')) return;
    try {
      await apiCall(`/api/tenants/${id}`, 'DELETE');
      loadTenants();
    } catch (error) {
      alert('Erreur lors de la suppression: ' + error.message);
    }
  };

  const openEditModal = tenant => {
    setEditingTenant(tenant);
    setFormData({ name: tenant.name });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTenant(null);
    setFormData({ name: '' });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Gestion des Tenants
          </h1>
          <p className="text-gray-500 mt-2">
            Gérez vos clients et organisations
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all"
        >
          <Plus className="w-5 h-5" />
          Nouveau Tenant
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tenants.map(tenant => (
          <div
            key={tenant.id}
            className="group relative overflow-hidden bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-2"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 opacity-0 group-hover:opacity-5 transition-opacity"></div>
            <div className="relative p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {tenant.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      ID: {tenant.id}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(tenant)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 flex items-center justify-center gap-2 font-medium transition-all"
                >
                  <Edit className="w-4 h-4" />
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(tenant.id)}
                  className="flex-1 px-4 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 flex items-center justify-center gap-2 font-medium transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <Modal
          onClose={closeModal}
          title={editingTenant ? 'Modifier Tenant' : 'Nouveau Tenant'}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Nom du Tenant
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                required
                placeholder="Ex: Client A"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg font-semibold transition-all"
              >
                {editingTenant ? 'Mettre à jour' : 'Créer'}
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold transition-all"
              >
                Annuler
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

// Endpoints Management
const EndpointsManager = () => {
  const [endpoints, setEndpoints] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [formData, setFormData] = useState({
    id: '',
    tenant_id: '',
    password: '',
    context: 'client-a-context',
    transport: 'transport-udp',
    allow: 'ulaw,alaw,g722',
    max_contacts: 1,
  });

  useEffect(() => {
    loadTenants();
    loadEndpoints();
  }, [selectedTenant]);

  const loadTenants = async () => {
    try {
      const data = await apiCall('/api/tenants');
      setTenants(data.data);
    } catch (error) {
      console.error('Erreur chargement tenants');
    }
  };

  const loadEndpoints = async () => {
    try {
      const url = selectedTenant
        ? `/api/endpoints?tenant_id=${selectedTenant}`
        : '/api/endpoints';
      const data = await apiCall(url);
      setEndpoints(data.data);
    } catch (error) {
      console.error('Erreur chargement endpoints');
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await apiCall('/api/endpoints', 'POST', formData);
      setShowModal(false);
      setFormData({
        id: '',
        tenant_id: '',
        password: '',
        context: 'client-a-context',
        transport: 'transport-udp',
        allow: 'ulaw,alaw,g722',
        max_contacts: 1,
      });
      loadEndpoints();
      alert('Endpoint créé avec succès');
    } catch (error) {
      alert('Erreur: ' + error.message);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Supprimer cet endpoint ?')) return;
    try {
      await apiCall(`/api/endpoints/${id}`, 'DELETE');
      loadEndpoints();
    } catch (error) {
      alert('Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Gestion des Endpoints
          </h1>
          <p className="text-gray-500 mt-2">
            Gérez vos extensions et dispositifs SIP
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedTenant}
            onChange={e => setSelectedTenant(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium"
          >
            <option value="">Tous les tenants</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all"
          >
            <Plus className="w-5 h-5" />
            Nouvel Endpoint
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Transport
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Contexte
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Codecs
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {endpoints.map(endpoint => (
                <tr
                  key={endpoint.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">
                    {endpoint.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {endpoint.tenant_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                        endpoint.transport?.includes('wss')
                          ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800'
                          : 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800'
                      }`}
                    >
                      {endpoint.transport?.includes('wss')
                        ? 'WebRTC'
                        : 'UDP/TCP'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {endpoint.context}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                    {endpoint.allow}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleDelete(endpoint.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal onClose={() => setShowModal(false)} title="Nouvel Endpoint">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  ID (Extension)
                </label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={e =>
                    setFormData({ ...formData, id: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                  required
                  placeholder="101"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Tenant
                </label>
                <select
                  value={formData.tenant_id}
                  onChange={e =>
                    setFormData({ ...formData, tenant_id: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                  required
                >
                  <option value="">Sélectionner...</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={e =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                  required
                  placeholder="password123"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Contexte
                </label>
                <input
                  type="text"
                  value={formData.context}
                  onChange={e =>
                    setFormData({ ...formData, context: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Transport
                </label>
                <select
                  value={formData.transport}
                  onChange={e =>
                    setFormData({ ...formData, transport: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                >
                  <option value="transport-udp">UDP (SIP Classique)</option>
                  <option value="transport-wss">WebSocket (WebRTC)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Codecs
                </label>
                <input
                  type="text"
                  value={formData.allow}
                  onChange={e =>
                    setFormData({ ...formData, allow: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                  placeholder="ulaw,alaw,g722"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg font-semibold transition-all"
              >
                Créer Endpoint
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold transition-all"
              >
                Annuler
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

// Queues Management
const QueuesManager = () => {
  const [queues, setQueues] = useState([]);
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [members, setMembers] = useState([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({ interface: '', membername: '' });

  useEffect(() => {
    loadQueues();
  }, []);

  useEffect(() => {
    if (selectedQueue) {
      loadMembers(selectedQueue);
    }
  }, [selectedQueue]);

  const loadQueues = async () => {
    try {
      const data = await apiCall('/api/queues');
      setQueues(data.data);
    } catch (error) {
      console.error('Erreur chargement queues');
    }
  };

  const loadMembers = async queueName => {
    try {
      const data = await apiCall(`/api/queues/${queueName}/members`);
      setMembers(data.data);
    } catch (error) {
      console.error('Erreur chargement membres');
    }
  };

  const handlePause = async (queueName, memberInterface, paused) => {
    try {
      const action = paused ? 'unpause' : 'pause';
      await apiCall(
        `/api/queues/${queueName}/members/${encodeURIComponent(
          memberInterface
        )}/${action}`,
        'PUT',
        { reason: 'Pause manuelle' }
      );
      loadMembers(queueName);
    } catch (error) {
      alert('Erreur lors de la pause');
    }
  };

  const handleAddMember = async e => {
    e.preventDefault();
    try {
      await apiCall(`/api/queues/${selectedQueue}/members`, 'POST', newMember);
      setShowAddMember(false);
      setNewMember({ interface: '', membername: '' });
      loadMembers(selectedQueue);
    } catch (error) {
      alert('Erreur: ' + error.message);
    }
  };

  const handleRemoveMember = async memberInterface => {
    if (!window.confirm('Retirer cet agent ?')) return;
    try {
      await apiCall(
        `/api/queues/${selectedQueue}/members/${encodeURIComponent(
          memberInterface
        )}`,
        'DELETE'
      );
      loadMembers(selectedQueue);
    } catch (error) {
      alert('Erreur lors du retrait');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Gestion des Files d'Attente
        </h1>
        <p className="text-gray-500 mt-2">Gérez vos queues et agents</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900">
            Files d'Attente
          </h2>
          <div className="space-y-3">
            {queues.map(queue => (
              <button
                key={queue.name}
                onClick={() => setSelectedQueue(queue.name)}
                className={`w-full text-left p-4 rounded-xl transition-all transform ${
                  selectedQueue === queue.name
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                }`}
              >
                <div className="font-bold text-lg">{queue.name}</div>
                <div
                  className={`text-sm mt-1 ${
                    selectedQueue === queue.name
                      ? 'text-blue-100'
                      : 'text-gray-500'
                  }`}
                >
                  {queue.strategy} • {queue.member_count} agents
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl p-6">
          {selectedQueue ? (
            <>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Agents de {selectedQueue}
                </h2>
                <button
                  onClick={() => setShowAddMember(true)}
                  className="px-5 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:shadow-lg flex items-center gap-2 font-semibold transform hover:scale-105 transition-all"
                >
                  <UserPlus className="w-5 h-5" />
                  Ajouter Agent
                </button>
              </div>
              <div className="space-y-4">
                {members.map(member => (
                  <div
                    key={member.interface}
                    className="flex items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-4 h-4 rounded-full shadow-lg ${
                          member.paused ? 'bg-red-500' : 'bg-green-500'
                        } animate-pulse`}
                      ></div>
                      <div>
                        <div className="font-bold text-gray-900">
                          {member.membername}
                        </div>
                        <div className="text-sm text-gray-600">
                          {member.interface} • Priorité: {member.penalty}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handlePause(
                            selectedQueue,
                            member.interface,
                            member.paused
                          )
                        }
                        className={`px-5 py-3 rounded-xl flex items-center gap-2 font-semibold transition-all transform hover:scale-105 ${
                          member.paused
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        }`}
                      >
                        {member.paused ? (
                          <Play className="w-4 h-4" />
                        ) : (
                          <Pause className="w-4 h-4" />
                        )}
                        {member.paused ? 'Reprendre' : 'Pause'}
                      </button>
                      <button
                        onClick={() => handleRemoveMember(member.interface)}
                        className="px-4 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 font-semibold transition-all transform hover:scale-105"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center text-gray-400 py-16">
              <Headphones className="w-20 h-20 mx-auto mb-4 opacity-30" />
              <p className="text-xl font-medium">
                Sélectionnez une queue pour voir ses agents
              </p>
            </div>
          )}
        </div>
      </div>

      {showAddMember && (
        <Modal onClose={() => setShowAddMember(false)} title="Ajouter un Agent">
          <form onSubmit={handleAddMember} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Interface (ex: PJSIP/101)
              </label>
              <input
                type="text"
                value={newMember.interface}
                onChange={e =>
                  setNewMember({ ...newMember, interface: e.target.value })
                }
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                required
                placeholder="PJSIP/101"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Nom de l'agent
              </label>
              <input
                type="text"
                value={newMember.membername}
                onChange={e =>
                  setNewMember({ ...newMember, membername: e.target.value })
                }
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                placeholder="Agent 101"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:shadow-lg font-semibold transition-all"
              >
                Ajouter
              </button>
              <button
                type="button"
                onClick={() => setShowAddMember(false)}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold transition-all"
              >
                Annuler
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

// CDR (Call History)
const CallHistory = () => {
  const [cdr, setCdr] = useState([]);
  const [filters, setFilters] = useState({ page: 1, limit: 20 });
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    loadCDR();
  }, [filters]);

  const loadCDR = async () => {
    try {
      const params = new URLSearchParams(filters).toString();
      const data = await apiCall(`/api/cdr?${params}`);
      setCdr(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Erreur chargement CDR');
    }
  };

  const formatDuration = seconds => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Historique des Appels
          </h1>
          <p className="text-gray-500 mt-2">
            Consultez tous vos enregistrements d'appels
          </p>
        </div>
        <a
          href={`${API_BASE_URL}/api/cdr/export/csv`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </a>
      </div>

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Appelant
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Appelé
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Durée
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cdr.map((call, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(call.start_time).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">
                    {call.caller}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">
                    {call.called}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDuration(call.total_duration)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        call.disposition === 'ANSWERED'
                          ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800'
                          : call.disposition === 'NO ANSWER'
                          ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800'
                          : call.disposition === 'BUSY'
                          ? 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800'
                          : 'bg-gradient-to-r from-red-100 to-red-200 text-red-800'
                      }`}
                    >
                      {call.disposition}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination && (
          <div className="px-6 py-5 bg-gradient-to-r from-gray-50 to-gray-100 flex justify-between items-center">
            <button
              onClick={() =>
                setFilters({ ...filters, page: Math.max(1, filters.page - 1) })
              }
              disabled={filters.page === 1}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold hover:shadow-lg transition-all"
            >
              Précédent
            </button>
            <span className="text-sm font-semibold text-gray-700">
              Page {pagination.page} sur {pagination.totalPages} • Total:{' '}
              {pagination.total} appels
            </span>
            <button
              onClick={() =>
                setFilters({
                  ...filters,
                  page: Math.min(pagination.totalPages, filters.page + 1),
                })
              }
              disabled={filters.page === pagination.totalPages}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold hover:shadow-lg transition-all"
            >
              Suivant
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Recordings Management
const RecordingsManager = () => {
  const [recordings, setRecordings] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadRecordings();
    loadStats();
  }, []);

  const loadRecordings = async () => {
    try {
      const data = await apiCall('/api/recordings');
      setRecordings(data.data || []);
    } catch (error) {
      console.error('Erreur chargement enregistrements');
    }
  };

  const loadStats = async () => {
    try {
      const data = await apiCall('/api/recordings/stats');
      setStats(data.data);
    } catch (error) {
      console.error('Erreur chargement stats');
    }
  };

  const handleDownload = id => {
    window.open(`${API_BASE_URL}/api/recordings/${id}/download`, '_blank');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Enregistrements Audio
        </h1>
        <p className="text-gray-500 mt-2">
          Accédez à tous vos enregistrements d'appels
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Enregistrements"
            value={stats.total_recordings}
            icon={<Volume2 className="w-8 h-8" />}
            color="blue"
          />
          <StatCard
            title="Taille Totale"
            value={`${stats.total_size_gb} GB`}
            icon={<Database className="w-8 h-8" />}
            color="purple"
          />
          <StatCard
            title="Durée Totale"
            value={`${Math.floor(stats.total_duration_seconds / 3600)}h`}
            icon={<Clock className="w-8 h-8" />}
            color="green"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recordings.length === 0 ? (
          <div className="col-span-full text-center py-16 text-gray-400">
            <Volume2 className="w-20 h-20 mx-auto mb-4 opacity-30" />
            <p className="text-xl font-medium">
              Aucun enregistrement disponible
            </p>
          </div>
        ) : (
          recordings.map(recording => (
            <div
              key={recording.id}
              className="group relative overflow-hidden bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-2"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 opacity-0 group-hover:opacity-5 transition-opacity"></div>
              <div className="relative p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                    <Volume2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm truncate text-gray-900">
                      {recording.filename}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(recording.created_at).toLocaleDateString(
                        'fr-FR'
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 font-medium">De:</span>
                    <span className="font-bold text-gray-900">
                      {recording.src}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 font-medium">Vers:</span>
                    <span className="font-bold text-gray-900">
                      {recording.dst}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 font-medium">Durée:</span>
                    <span className="font-bold text-gray-900">
                      {recording.duration}s
                    </span>
                  </div>
                  {recording.filesize && (
                    <div className="flex justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-gray-600 font-medium">Taille:</span>
                      <span className="font-bold text-gray-900">
                        {(recording.filesize / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDownload(recording.id)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg flex items-center justify-center gap-2 font-semibold transition-all"
                >
                  <Download className="w-5 h-5" />
                  Télécharger
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Active Calls Monitor
const ActiveCalls = () => {
  const [channels, setChannels] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadChannels();
    let interval;
    if (autoRefresh) {
      interval = setInterval(loadChannels, 5000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const loadChannels = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/api/asterisk/channels');
      setChannels(data.data?.events || []);
    } catch (error) {
      console.error('Erreur chargement canaux');
    } finally {
      setLoading(false);
    }
  };

  const hangupChannel = async channelName => {
    if (!window.confirm('Raccrocher cet appel ?')) return;
    try {
      await apiCall(
        `/api/asterisk/channels/${encodeURIComponent(channelName)}`,
        'DELETE'
      );
      loadChannels();
    } catch (error) {
      alert('Erreur lors du raccrochage');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Appels Actifs
          </h1>
          <p className="text-gray-500 mt-2">
            Surveillez les appels en temps réel
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-6 py-3 rounded-xl flex items-center gap-2 font-semibold transition-all transform hover:scale-105 ${
              autoRefresh
                ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            <Activity className="w-5 h-5" />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
          <button
            onClick={loadChannels}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg flex items-center gap-2 font-semibold disabled:bg-gray-400 transition-all"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {channels.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <PhoneCall className="w-20 h-20 mx-auto mb-4 opacity-30" />
            <p className="text-xl font-medium">Aucun appel actif</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Canal
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    État
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Contexte
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {channels.map((channel, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                      {channel.channel || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-green-100 to-green-200 text-green-800">
                        Actif
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {channel.context || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => hangupChannel(channel.channel)}
                        className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:shadow-lg text-sm font-semibold transition-all"
                      >
                        Raccrocher
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// Statistics Component
const Statistics = () => {
  const [stats, setStats] = useState(null);
  const [topCallers, setTopCallers] = useState([]);
  const [topCalled, setTopCalled] = useState([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [callsData, callersData, calledData] = await Promise.all([
        apiCall('/api/statistics/calls'),
        apiCall('/api/statistics/top-callers?limit=5'),
        apiCall('/api/statistics/top-called?limit=5'),
      ]);
      setStats(callsData.data);
      setTopCallers(callersData.data);
      setTopCalled(calledData.data);
    } catch (error) {
      console.error('Erreur chargement statistiques');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Statistiques Avancées
        </h1>
        <p className="text-gray-500 mt-2">
          Analysez vos performances en détail
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Appels"
            value={stats.total_calls}
            icon={<PhoneCall className="w-8 h-8" />}
            color="blue"
          />
          <StatCard
            title="Répondus"
            value={stats.answered_calls}
            icon={<TrendingUp className="w-8 h-8" />}
            color="green"
          />
          <StatCard
            title="Non Répondus"
            value={stats.no_answer_calls}
            icon={<PhoneMissed className="w-8 h-8" />}
            color="yellow"
          />
          <StatCard
            title="Taux Réponse"
            value={`${stats.answer_rate_percent}%`}
            icon={<BarChart3 className="w-8 h-8" />}
            color="purple"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Top 5 Appelants</h3>
          </div>
          <div className="space-y-3">
            {topCallers.map((caller, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl hover:shadow-md transition-all"
              >
                <div>
                  <div className="font-bold text-gray-900">{caller.caller}</div>
                  <div className="text-sm text-gray-600">
                    {caller.answered_calls} répondus sur {caller.total_calls}
                  </div>
                </div>
                <div className="text-2xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {caller.total_calls}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Phone className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              Top 5 Numéros Appelés
            </h3>
          </div>
          <div className="space-y-3">
            {topCalled.map((called, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl hover:shadow-md transition-all"
              >
                <div>
                  <div className="font-bold text-gray-900">{called.called}</div>
                  <div className="text-sm text-gray-600">
                    {called.answered_calls} répondus sur {called.total_calls}
                  </div>
                </div>
                <div className="text-2xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {called.total_calls}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Asterisk Administration
const AsteriskAdmin = () => {
  const [status, setStatus] = useState(null);
  const [originateData, setOriginateData] = useState({
    channel: '',
    extension: '',
    context: 'client-a-context',
    callerid: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const data = await apiCall('/api/asterisk/status');
      setStatus(data.data);
    } catch (error) {
      console.error('Erreur chargement statut');
    }
  };

  const handleReload = async (module = null) => {
    setLoading(true);
    try {
      const endpoint = module
        ? `/api/asterisk/reload/${module}`
        : '/api/asterisk/reload';
      await apiCall(endpoint, 'POST');
      alert('Rechargement effectué avec succès');
      loadStatus();
    } catch (error) {
      alert('Erreur lors du rechargement: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOriginate = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiCall('/api/asterisk/originate', 'POST', {
        ...originateData,
        async: true,
      });
      alert('Appel initié avec succès');
      setOriginateData({
        channel: '',
        extension: '',
        context: 'client-a-context',
        callerid: '',
      });
    } catch (error) {
      alert('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Administration Asterisk
        </h1>
        <p className="text-gray-500 mt-2">Contrôlez votre serveur Asterisk</p>
      </div>

      {/* Server Status */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="AMI Connecté"
            value={status.ami_connected ? 'OUI' : 'NON'}
            icon={<Wifi className="w-8 h-8" />}
            color={status.ami_connected ? 'green' : 'red'}
          />
          <StatCard
            title="Appels Actifs"
            value={status.core_status?.corecurrentcalls || '0'}
            icon={<PhoneCall className="w-8 h-8" />}
            color="blue"
          />
          <StatCard
            title="Appels Traités"
            value={status.core_status?.coreprocessedcalls || '0'}
            icon={<Activity className="w-8 h-8" />}
            color="purple"
          />
          <StatCard
            title="Version"
            value={
              status.core_settings?.asteriskversion?.substring(0, 6) || '-'
            }
            icon={<Settings className="w-8 h-8" />}
            color="orange"
          />
        </div>
      )}

      {/* Reload Actions */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <RefreshCw className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            Actions de Rechargement
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => handleReload()}
            disabled={loading}
            className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg disabled:bg-gray-400 flex flex-col items-center justify-center gap-2 font-semibold transition-all transform hover:scale-105"
          >
            <RefreshCw className="w-6 h-6" />
            <span>Tout</span>
          </button>
          <button
            onClick={() => handleReload('pjsip')}
            disabled={loading}
            className="px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:shadow-lg disabled:bg-gray-400 flex flex-col items-center justify-center gap-2 font-semibold transition-all transform hover:scale-105"
          >
            <Phone className="w-6 h-6" />
            <span>PJSIP</span>
          </button>
          <button
            onClick={() => handleReload('dialplan')}
            disabled={loading}
            className="px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:shadow-lg disabled:bg-gray-400 flex flex-col items-center justify-center gap-2 font-semibold transition-all transform hover:scale-105"
          >
            <Settings className="w-6 h-6" />
            <span>Dialplan</span>
          </button>
          <button
            onClick={() => handleReload('app_queue.so')}
            disabled={loading}
            className="px-6 py-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:shadow-lg disabled:bg-gray-400 flex flex-col items-center justify-center gap-2 font-semibold transition-all transform hover:scale-105"
          >
            <Headphones className="w-6 h-6" />
            <span>Queues</span>
          </button>
        </div>
      </div>

      {/* Click to Call */}
      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-white bg-opacity-20 rounded-lg backdrop-blur">
            <PhoneCall className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">
            Initier un Appel (Click-to-Call)
          </h2>
        </div>
        <form
          onSubmit={handleOriginate}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-bold mb-2 text-white opacity-90">
              Canal Source (ex: PJSIP/101)
            </label>
            <input
              type="text"
              value={originateData.channel}
              onChange={e =>
                setOriginateData({ ...originateData, channel: e.target.value })
              }
              className="w-full px-4 py-3 border-2 border-white border-opacity-20 rounded-xl bg-white bg-opacity-10 backdrop-blur text-white placeholder-white placeholder-opacity-50 focus:ring-4 focus:ring-white focus:ring-opacity-30 focus:border-white transition-all"
              placeholder="PJSIP/101"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 text-white opacity-90">
              Extension Destination
            </label>
            <input
              type="text"
              value={originateData.extension}
              onChange={e =>
                setOriginateData({
                  ...originateData,
                  extension: e.target.value,
                })
              }
              className="w-full px-4 py-3 border-2 border-white border-opacity-20 rounded-xl bg-white bg-opacity-10 backdrop-blur text-white placeholder-white placeholder-opacity-50 focus:ring-4 focus:ring-white focus:ring-opacity-30 focus:border-white transition-all"
              placeholder="102"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 text-white opacity-90">
              Contexte
            </label>
            <input
              type="text"
              value={originateData.context}
              onChange={e =>
                setOriginateData({ ...originateData, context: e.target.value })
              }
              className="w-full px-4 py-3 border-2 border-white border-opacity-20 rounded-xl bg-white bg-opacity-10 backdrop-blur text-white placeholder-white placeholder-opacity-50 focus:ring-4 focus:ring-white focus:ring-opacity-30 focus:border-white transition-all"
              placeholder="client-a-context"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 text-white opacity-90">
              Caller ID (optionnel)
            </label>
            <input
              type="text"
              value={originateData.callerid}
              onChange={e =>
                setOriginateData({ ...originateData, callerid: e.target.value })
              }
              className="w-full px-4 py-3 border-2 border-white border-opacity-20 rounded-xl bg-white bg-opacity-10 backdrop-blur text-white placeholder-white placeholder-opacity-50 focus:ring-4 focus:ring-white focus:ring-opacity-30 focus:border-white transition-all"
              placeholder="API Call <101>"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full px-8 py-4 bg-white text-green-600 rounded-xl hover:shadow-2xl disabled:bg-gray-400 flex items-center justify-center gap-3 font-bold text-lg transition-all transform hover:scale-105"
            >
              <PhoneCall className="w-6 h-6" />
              Lancer l'Appel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tenants', label: 'Tenants', icon: Users },
    { id: 'endpoints', label: 'Endpoints', icon: Phone },
    { id: 'queues', label: "Files d'Attente", icon: Headphones },
    { id: 'cdr', label: 'Historique', icon: FileText },
    { id: 'recordings', label: 'Enregistrements', icon: Volume2 },
    { id: 'active', label: 'Appels Actifs', icon: Activity },
    { id: 'statistics', label: 'Statistiques', icon: BarChart3 },
    { id: 'admin', label: 'Administration', icon: Settings },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'tenants':
        return <TenantsManager />;
      case 'endpoints':
        return <EndpointsManager />;
      case 'queues':
        return <QueuesManager />;
      case 'cdr':
        return <CallHistory />;
      case 'recordings':
        return <RecordingsManager />;
      case 'active':
        return <ActiveCalls />;
      case 'statistics':
        return <Statistics />;
      case 'admin':
        return <AsteriskAdmin />;
      default:
        return <Dashboard />;
    }
  };
  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white transition-all duration-300 flex flex-col shadow-2xl`}
      >
        <div className="p-4 flex items-center justify-between border-b border-gray-700">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Phone className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Asterisk
              </h1>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-all"
          >
            {sidebarOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all transform ${
                currentPage === item.id
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && (
                <span className="font-semibold">{item.label}</span>
              )}
            </button>
          ))}
          <button
            onClick={() => {
              localStorage.removeItem('isAuthenticated');
              setIsAuthenticated(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-gray-800 hover:text-white transition-all"
          >
            <Power className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="font-semibold">Déconnexion</span>}
          </button>
        </nav>

        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                <Wifi className="w-5 h-5" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            </div>
            {sidebarOpen && (
              <div>
                <div className="font-bold text-sm">Serveur Actif</div>
                <div className="text-xs text-gray-400">161.97.106.134</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">{renderPage()}</div>
      </div>
    </div>
  );
};

export default App;
