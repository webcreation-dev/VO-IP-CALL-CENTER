/**
 * Softphone Standalone App - Root Component
 */

import { useState } from 'react';
import { SoftphoneWidget } from '@modules/softphone';
import type { SipConfig } from '@modules/softphone';

export default function App() {
  const [sipConfig, setSipConfig] = useState<SipConfig | null>(null);

  // For now, we'll use a login form to get credentials
  // In production, this would be fetched from the backend API
  const handleLogin = (config: SipConfig) => {
    setSipConfig(config);
  };

  // Simple login form if not configured
  if (!sipConfig) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <SoftphoneWidget
      layout="fullpage"
      theme="light"
      sipConfig={sipConfig}
      autoConnect={true}
    />
  );
}

// Simple login form component
function LoginForm({ onLogin }: { onLogin: (config: SipConfig) => void }) {
  const [formData, setFormData] = useState({
    server: 'pishon.kabou.bj',
    port: '8089',
    username: '',
    password: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin({
      server: formData.server,
      port: parseInt(formData.port),
      username: formData.username,
      password: formData.password,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Softphone WebRTC</h1>
          <p className="text-gray-600 mt-2">Connectez-vous à votre serveur SIP</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Serveur
            </label>
            <input
              type="text"
              value={formData.server}
              onChange={(e) =>
                setFormData({ ...formData, server: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Port
            </label>
            <input
              type="text"
              value={formData.port}
              onChange={(e) => setFormData({ ...formData, port: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom d'utilisateur SIP
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Se connecter
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Utilisez vos identifiants SIP Asterisk
          </p>
        </div>
      </div>
    </div>
  );
}
