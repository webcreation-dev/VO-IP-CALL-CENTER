/**
 * CallStatus Component
 *
 * Displays connection status, call state, and call timer with enhanced visuals
 */

import { useMemo } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOff,
  PhoneOutgoing,
  Clock,
  User,
  Pause,
} from 'lucide-react';
import type { ConnectionStatus, CallInfo } from '../../core/types';

interface CallStatusProps {
  connectionStatus: ConnectionStatus;
  currentCall: CallInfo | null;
  incomingCall: CallInfo | null;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
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
        dotColor: 'bg-gray-400',
      };
    case 'connecting':
      return {
        icon: Phone,
        text: 'Connexion...',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        dotColor: 'bg-yellow-500',
        animate: true,
      };
    case 'connected':
      return {
        icon: Phone,
        text: 'Connecté',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        dotColor: 'bg-blue-500',
      };
    case 'registered':
      return {
        icon: Phone,
        text: 'Prêt',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        dotColor: 'bg-green-500',
      };
    case 'error':
      return {
        icon: PhoneOff,
        text: 'Erreur',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        dotColor: 'bg-red-500',
      };
    default:
      return {
        icon: Phone,
        text: 'Inconnu',
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        dotColor: 'bg-gray-400',
      };
  }
}

function getCallStateInfo(call: CallInfo) {
  switch (call.state) {
    case 'dialing':
      return {
        icon: PhoneOutgoing,
        text: 'Appel sortant...',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        animate: true,
      };
    case 'ringing':
      return {
        icon: PhoneIncoming,
        text: 'Sonnerie...',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        animate: true,
      };
    case 'in-call':
      return {
        icon: PhoneCall,
        text: 'En communication',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        animate: false,
      };
    case 'holding':
      return {
        icon: Pause,
        text: 'En attente',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        animate: false,
      };
    default:
      return {
        icon: Phone,
        text: call.state,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        animate: false,
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

  // If there's an active call, show enhanced call info
  if (currentCall) {
    const callInfo = getCallStateInfo(currentCall);
    const CallIcon = callInfo.icon;

    return (
      <div className={`py-3 px-4 border-b ${callInfo.bgColor} border-l-4 ${callInfo.borderColor}`}>
        {/* Call State Badge */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CallIcon
              className={`h-4 w-4 ${callInfo.color} ${callInfo.animate ? 'animate-pulse' : ''}`}
            />
            <span className={`text-xs font-semibold uppercase tracking-wide ${callInfo.color}`}>
              {callInfo.text}
            </span>
          </div>

          {/* Direction Badge */}
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              currentCall.direction === 'inbound'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {currentCall.direction === 'inbound' ? 'Entrant' : 'Sortant'}
          </span>
        </div>

        {/* Remote Party Info */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">
              {currentCall.remoteIdentity || 'Inconnu'}
            </p>
            <p className="text-sm text-muted-foreground">
              {currentCall.remoteNumber}
            </p>
          </div>
        </div>

        {/* Duration Timer */}
        {(currentCall.state === 'in-call' || currentCall.state === 'holding') && (
          <div className="flex items-center justify-center gap-2 py-2 bg-background/50 rounded-md">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xl font-mono font-bold text-foreground">
              {formatDuration(currentCall.duration)}
            </span>
          </div>
        )}
      </div>
    );
  }

  // If there's an incoming call, show it with enhanced styling
  if (incomingCall) {
    return (
      <div className="py-3 px-4 border-b bg-purple-50 border-l-4 border-purple-400">
        {/* Incoming Call Badge */}
        <div className="flex items-center gap-2 mb-2">
          <PhoneIncoming className="h-4 w-4 text-purple-600 animate-bounce" />
          <span className="text-xs font-semibold uppercase tracking-wide text-purple-600">
            Appel entrant
          </span>
        </div>

        {/* Caller Info */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center animate-pulse">
            <User className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-purple-900 truncate">
              {incomingCall.remoteIdentity || 'Inconnu'}
            </p>
            <p className="text-sm text-purple-700">
              {incomingCall.remoteNumber}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Default: show connection status with dot indicator
  return (
    <div className={`flex items-center gap-2 py-2 px-4 ${statusInfo.bgColor}`}>
      <span
        className={`w-2 h-2 rounded-full ${statusInfo.dotColor} ${
          statusInfo.animate ? 'animate-pulse' : ''
        }`}
      />
      <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
      <span className={`text-sm font-medium ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    </div>
  );
}
