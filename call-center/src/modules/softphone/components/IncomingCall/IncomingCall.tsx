/**
 * IncomingCall Component
 *
 * UI for answering or rejecting incoming calls
 */

import { Phone, PhoneOff, User } from 'lucide-react';
import type { CallInfo } from '../../core/types';

interface IncomingCallProps {
  call: CallInfo;
  onAnswer: () => void;
  onReject: () => void;
}

export function IncomingCall({ call, onAnswer, onReject }: IncomingCallProps) {
  return (
    <div className="p-6 space-y-6 bg-gradient-to-b from-purple-50 to-white">
      {/* Caller Info */}
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center">
            <User className="h-10 w-10 text-purple-600" />
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-gray-900">
            {call.remoteIdentity || 'Appelant inconnu'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {call.remoteNumber}
          </p>
        </div>

        <p className="text-sm font-medium text-purple-600 animate-pulse">
          Appel entrant...
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-8">
        {/* Reject Button */}
        <button
          onClick={onReject}
          className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow-lg"
        >
          <PhoneOff className="h-8 w-8" />
        </button>

        {/* Answer Button */}
        <button
          onClick={onAnswer}
          className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-colors shadow-lg animate-pulse"
        >
          <Phone className="h-10 w-10" />
        </button>
      </div>

      {/* Helper Text */}
      <div className="text-center space-y-1">
        <p className="text-xs text-muted-foreground">
          Appuyez sur le bouton vert pour répondre
        </p>
        <p className="text-xs text-muted-foreground">
          ou le bouton rouge pour refuser
        </p>
      </div>
    </div>
  );
}
