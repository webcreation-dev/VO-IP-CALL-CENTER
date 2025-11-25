/**
 * CallControls Component
 *
 * Controls during an active call (mute, hold, hangup, DTMF)
 */

import { PhoneOff, Mic, MicOff, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CallInfo } from '../../core/types';

interface CallControlsProps {
  call: CallInfo;
  onHangup: () => void;
  onToggleMute: () => void;
  onToggleHold: () => void;
  onSendDTMF?: (digit: string) => void;
}

export function CallControls({
  call,
  onHangup,
  onToggleMute,
  onToggleHold,
  onSendDTMF,
}: CallControlsProps) {
  return (
    <div className="space-y-4 p-4">
      {/* Primary Controls */}
      <div className="flex items-center justify-center gap-4">
        {/* Mute/Unmute */}
        <Button
          variant={call.isMuted ? 'destructive' : 'outline'}
          size="lg"
          onClick={onToggleMute}
          className="w-16 h-16 rounded-full"
        >
          {call.isMuted ? (
            <MicOff className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </Button>

        {/* Hangup */}
        <Button
          variant="destructive"
          size="lg"
          onClick={onHangup}
          className="w-20 h-20 rounded-full"
        >
          <PhoneOff className="h-8 w-8" />
        </Button>

        {/* Hold/Resume */}
        <Button
          variant={call.isOnHold ? 'default' : 'outline'}
          size="lg"
          onClick={onToggleHold}
          className="w-16 h-16 rounded-full"
        >
          {call.isOnHold ? (
            <Play className="h-6 w-6" />
          ) : (
            <Pause className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* Status Text */}
      <div className="text-center space-y-1">
        {call.isMuted && (
          <p className="text-sm text-red-600 font-medium">Micro coupé</p>
        )}
        {call.isOnHold && (
          <p className="text-sm text-yellow-600 font-medium">Appel en attente</p>
        )}
      </div>

      {/* DTMF Pad (Optional - can be expanded) */}
      {onSendDTMF && call.state === 'in-call' && (
        <details className="mt-4">
          <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
            Clavier DTMF
          </summary>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
              <Button
                key={digit}
                variant="outline"
                size="sm"
                onClick={() => onSendDTMF(digit)}
                className="h-12"
              >
                {digit}
              </Button>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
