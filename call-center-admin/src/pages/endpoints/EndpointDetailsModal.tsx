import { X, Phone, Shield, Wifi, Clock } from 'lucide-react';
import type { PsEndpoint } from '../../types/api';

interface EndpointDetailsModalProps {
  endpoint: PsEndpoint;
  onClose: () => void;
}

export default function EndpointDetailsModal({ endpoint, onClose }: EndpointDetailsModalProps) {
  const getStatusBadge = (status?: string) => {
    const isOnline = status === 'ONLINE';
    return (
      <span
        className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
          isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}
      >
        {isOnline ? 'En ligne' : 'Hors ligne'}
      </span>
    );
  };

  const getDeviceStateBadge = (deviceState?: string) => {
    if (!deviceState) return <span className="text-gray-500">-</span>;

    const stateColors: Record<string, string> = {
      'NOT_INUSE': 'bg-green-100 text-green-800',
      'INUSE': 'bg-blue-100 text-blue-800',
      'BUSY': 'bg-red-100 text-red-800',
      'UNAVAILABLE': 'bg-gray-100 text-gray-800',
      'RINGING': 'bg-yellow-100 text-yellow-800',
      'ONHOLD': 'bg-purple-100 text-purple-800',
    };

    const stateLabels: Record<string, string> = {
      'NOT_INUSE': 'Disponible',
      'INUSE': 'En cours',
      'BUSY': 'Occupé',
      'UNAVAILABLE': 'Indisponible',
      'RINGING': 'Sonnerie',
      'ONHOLD': 'En attente',
    };

    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${stateColors[deviceState] || 'bg-gray-100 text-gray-800'}`}>
        {stateLabels[deviceState] || deviceState}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-full bg-white bg-opacity-20">
                  <Phone className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <h3 className="text-xl font-semibold text-white">{endpoint.endpoint}</h3>
                  <p className="text-indigo-100">{endpoint.callerid || 'Endpoint PJSIP'}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-indigo-100"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="bg-white px-6 py-6 space-y-6">
            {/* Status Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Wifi className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-500">Statut de connexion</span>
                </div>
                <div className="mt-2">
                  {getStatusBadge(endpoint.status)}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-500">État du périphérique</span>
                </div>
                <div className="mt-2">
                  {getDeviceStateBadge(endpoint.deviceState)}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-500">Dernière mise à jour</span>
                </div>
                <div className="mt-2 text-sm text-gray-900">
                  {endpoint.lastUpdate
                    ? new Date(endpoint.lastUpdate).toLocaleString('fr-FR')
                    : '-'}
                </div>
              </div>
            </div>

            {/* Configuration Section */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-indigo-600" />
                Configuration
              </h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Endpoint</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">{endpoint.endpoint}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Auth</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">{endpoint.auth}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">AORs</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">{endpoint.aors || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Caller ID</dt>
                    <dd className="mt-1 text-sm text-gray-900">{endpoint.callerid || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Contexte</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">{endpoint.context || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Transport</dt>
                    <dd className="mt-1 text-sm text-gray-900">{endpoint.transport || 'UDP'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Codecs autorisés</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">{endpoint.allow || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Direct Media</dt>
                    <dd className="mt-1 text-sm text-gray-900">{endpoint.directMedia || 'no'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">DTMF Mode</dt>
                    <dd className="mt-1 text-sm text-gray-900">{endpoint.dtmfMode || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Tenant</dt>
                    <dd className="mt-1 text-sm text-gray-900">{endpoint.tenant?.name || '-'}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Contact Info (if online) */}
            {endpoint.contactStatus && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Informations de contact</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <dl className="grid grid-cols-1 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Adresse de contact</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-mono break-all">
                        {endpoint.contactStatus}
                      </dd>
                    </div>
                    {endpoint.userAgent && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">User Agent</dt>
                        <dd className="mt-1 text-sm text-gray-900">{endpoint.userAgent}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            )}

            {/* Advanced Configuration */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Configuration avancée</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Identify By</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">
                      {endpoint.identifyBy || 'username,auth_username'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Device State Busy At</dt>
                    <dd className="mt-1 text-sm text-gray-900">{endpoint.deviceStateBusyAt || '1'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">RTP Symmetric</dt>
                    <dd className="mt-1 text-sm text-gray-900">{endpoint.rtpSymmetric || 'yes'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Force RPORT</dt>
                    <dd className="mt-1 text-sm text-gray-900">{endpoint.forceRport || 'yes'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Rewrite Contact</dt>
                    <dd className="mt-1 text-sm text-gray-900">{endpoint.rewriteContact || 'yes'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Trust ID Inbound</dt>
                    <dd className="mt-1 text-sm text-gray-900">{endpoint.trustIdInbound || 'no'}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Timestamps */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Informations système</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Date de création</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(endpoint.createdAt).toLocaleString('fr-FR')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Dernière modification</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(endpoint.updatedAt).toLocaleString('fr-FR')}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4">
            <button
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
