/**
 * CallStatus Component
 *
 * Displays connection status, call state, and call timer
 */

import { useMemo } from 'react';
import { Phone, PhoneCall, PhoneIncoming, PhoneOff } from 'lucide-react';
import type { ConnectionStatus, CallInfo } from '../../core/types';

interface CallStatusProps {
  connectionStatus: ConnectionStatus;
  currentCall: CallInfo | null;
  incomingCall: CallInfo | null;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getConnectionStatusInfo(status: ConnectionStatus) {
  switch (status) {
    case 'disconnected':
      return {
        icon: PhoneOff,
        text: 'Déconnecté',
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
      };
    case 'connecting':
      return {
        icon: Phone,
        text: 'Connexion...',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
      };
    case 'connected':
      return {
        icon: Phone,
        text: 'Connecté',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
      };
    case 'registered':
      return {
        icon: Phone,
        text: 'Prêt',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
      };
    case 'error':
      return {
        icon: PhoneOff,
        text: 'Erreur',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
      };
    default:
      return {
        icon: Phone,
        text: 'Inconnu',
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
      };
  }
}

function getCallStateInfo(call: CallInfo) {
  switch (call.state) {
    case 'dialing':
      return {
        icon: PhoneCall,
        text: 'Appel en cours...',
        color: 'text-blue-600',
      };
    case 'ringing':
      return {
        icon: PhoneIncoming,
        text: 'Sonnerie...',
        color: 'text-purple-600',
      };
    case 'in-call':
      return {
        icon: PhoneCall,
        text: 'En communication',
        color: 'text-green-600',
      };
    case 'holding':
      return {
        icon: Phone,
        text: 'En attente',
        color: 'text-yellow-600',
      };
    default:
      return {
        icon: Phone,
        text: call.state,
        color: 'text-gray-600',
      };
  }
}

export function CallStatus({
  connectionStatus,
  currentCall,
  incomingCall,
}: CallStatusProps) {
  const statusInfo = useMemo(
    () => getConnectionStatusInfo(connectionStatus),
    [connectionStatus]
  );

  const StatusIcon = statusInfo.icon;

  // If there's an active call, show call info
  if (currentCall) {
    const callInfo = getCallStateInfo(currentCall);
    const CallIcon = callInfo.icon;

    return (
      <div className="flex items-center justify-between py-3 px-4 border-b">
        <div className="flex items-center gap-2">
          <CallIcon className={`h-5 w-5 ${callInfo.color}`} />
          <div>
            <div className={`font-medium ${callInfo.color}`}>
              {callInfo.text}
            </div>
            <div className="text-sm text-muted-foreground">
              {currentCall.remoteIdentity || currentCall.remoteNumber}
            </div>
          </div>
        </div>

        {currentCall.state === 'in-call' && (
          <div className="text-lg font-mono font-semibold">
            {formatDuration(currentCall.duration)}
          </div>
        )}
      </div>
    );
  }

  // If there's an incoming call, show it
  if (incomingCall) {
    return (
      <div className="flex items-center justify-between py-3 px-4 border-b bg-purple-50">
        <div className="flex items-center gap-2">
          <PhoneIncoming className="h-5 w-5 text-purple-600 animate-pulse" />
          <div>
            <div className="font-medium text-purple-600">
              Appel entrant
            </div>
            <div className="text-sm text-muted-foreground">
              {incomingCall.remoteIdentity || incomingCall.remoteNumber}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: show connection status
  return (
    <div className={`flex items-center gap-2 py-2 px-4 ${statusInfo.bgColor}`}>
      <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
      <span className={`text-sm font-medium ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    </div>
  );
}
