/**
 * CallControls Component
 *
 * Controls during an active call (mute, hold, hangup, transfer, DTMF)
 */

import { useState } from 'react';
import { PhoneOff, Mic, MicOff, Pause, Play, PhoneForwarded } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CallInfo } from '../../core/types';
import { TransferPanel } from '../TransferPanel';

interface CallControlsProps {
  call: CallInfo;
  onHangup: () => void;
  onToggleMute: () => void;
  onToggleHold: () => void;
  onSendDTMF?: (digit: string) => void;
  onTransfer?: (extension: string) => Promise<void>;
}

export function CallControls({
  call,
  onHangup,
  onToggleMute,
  onToggleHold,
  onSendDTMF,
  onTransfer,
}: CallControlsProps) {
  const [showTransferPanel, setShowTransferPanel] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  const handleTransfer = async (extension: string) => {
    if (!onTransfer) return;

    setIsTransferring(true);
    try {
      await onTransfer(extension);
      setShowTransferPanel(false);
    } catch (error) {
      // Error is handled in TransferPanel
      throw error;
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      {/* Primary Controls */}
      <div className="flex items-center justify-center gap-3">
        {/* Mute/Unmute */}
        <Button
          variant={call.isMuted ? 'destructive' : 'outline'}
          size="lg"
          onClick={onToggleMute}
          className="w-14 h-14 rounded-full"
          title={call.isMuted ? 'Réactiver le micro' : 'Couper le micro'}
        >
          {call.isMuted ? (
            <MicOff className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>

        {/* Hangup */}
        <Button
          variant="destructive"
          size="lg"
          onClick={onHangup}
          className="w-16 h-16 rounded-full"
          title="Raccrocher"
        >
          <PhoneOff className="h-6 w-6" />
        </Button>

        {/* Hold/Resume */}
        <Button
          variant={call.isOnHold ? 'default' : 'outline'}
          size="lg"
          onClick={onToggleHold}
          className="w-14 h-14 rounded-full"
          title={call.isOnHold ? 'Reprendre' : 'Mettre en attente'}
        >
          {call.isOnHold ? (
            <Play className="h-5 w-5" />
          ) : (
            <Pause className="h-5 w-5" />
          )}
        </Button>

        {/* Transfer */}
        {onTransfer && call.state === 'in-call' && (
          <Button
            variant={showTransferPanel ? 'default' : 'outline'}
            size="lg"
            onClick={() => setShowTransferPanel(!showTransferPanel)}
            className="w-14 h-14 rounded-full"
            title="Transférer l'appel"
            disabled={isTransferring}
          >
            <PhoneForwarded className="h-5 w-5" />
          </Button>
        )}
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

      {/* Transfer Panel */}
      {showTransferPanel && onTransfer && (
        <TransferPanel
          onTransfer={handleTransfer}
          onCancel={() => setShowTransferPanel(false)}
          isTransferring={isTransferring}
        />
      )}

      {/* DTMF Pad (Optional - can be expanded) */}
      {onSendDTMF && call.state === 'in-call' && !showTransferPanel && (
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
