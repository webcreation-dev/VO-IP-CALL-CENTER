/**
 * SoftphoneWidget - Main Component
 *
 * Main softphone component that orchestrates all sub-components
 * Can be used in widget mode or fullpage mode
 */

import { useEffect } from 'react';
import { useSoftphone } from '../hooks/useSoftphone';
import { WidgetLayout } from '../layouts/WidgetLayout';
import { FullPageLayout } from '../layouts/FullPageLayout';
import { CallStatus } from './CallStatus/CallStatus';
import { Dialer } from './Dialer/Dialer';
import { CallControls } from './CallControls/CallControls';
import { IncomingCall } from './IncomingCall/IncomingCall';
import { ConnectedAs } from './ConnectedAs/ConnectedAs';
import type { SipConfig } from '../core/types';
import { Button } from '@/components/ui/button';
import { Power, PowerOff } from 'lucide-react';
import { useEndpointSelectionStore, useSelectedEndpointConfig } from '../store/endpointSelectionStore';

interface SoftphoneWidgetProps {
  layout?: 'widget' | 'fullpage';
  theme?: 'light' | 'dark' | 'admin';
  sipConfig?: SipConfig | null;
  autoConnect?: boolean;
  onClose?: () => void;
}

export function SoftphoneWidget({
  layout = 'widget',
  theme = 'light',
  sipConfig = null,
  autoConnect = false,
  onClose,
}: SoftphoneWidgetProps) {
  const {
    connectionStatus,
    isConnected,
    isRegistered,
    currentCall,
    incomingCall,
    isMinimized,
    position,
    connect,
    disconnect,
    makeCall,
    answerCall,
    rejectCall,
    hangup,
    toggleMute,
    toggleHold,
    sendDTMF,
    setMinimized,
    setPosition,
  } = useSoftphone();

  // Get endpoint selection config (for admin mode)
  const selectedEndpointConfig = useSelectedEndpointConfig();

  // Use endpoint config if available, otherwise use provided sipConfig
  const effectiveConfig = selectedEndpointConfig || sipConfig;

  // Auto-connect if enabled or when endpoint is selected
  useEffect(() => {
    if (effectiveConfig && !isConnected) {
      if (autoConnect || selectedEndpointConfig) {
        connect(effectiveConfig).catch((error) => {
          console.error('Auto-connect failed:', error);
        });
      }
    }
  }, [autoConnect, effectiveConfig, isConnected, selectedEndpointConfig]);

  // Disconnect from endpoint when selection is cleared
  useEffect(() => {
    if (!selectedEndpointConfig && isConnected && !sipConfig) {
      disconnect();
    }
  }, [selectedEndpointConfig, isConnected, sipConfig]);

  // Render content
  const renderContent = () => {
    // If there's an incoming call, show incoming call UI
    if (incomingCall) {
      return (
        <IncomingCall
          call={incomingCall}
          onAnswer={answerCall}
          onReject={rejectCall}
        />
      );
    }

    // If there's an active call, show call controls
    if (currentCall) {
      return (
        <CallControls
          call={currentCall}
          onHangup={hangup}
          onToggleMute={toggleMute}
          onToggleHold={toggleHold}
          onSendDTMF={sendDTMF}
        />
      );
    }

    // Default: show dialer
    return (
      <div className="p-4 space-y-4">
        {/* Connection Controls */}
        {!isConnected && effectiveConfig && (
          <Button
            onClick={() => connect(effectiveConfig)}
            disabled={connectionStatus === 'connecting'}
            className="w-full"
          >
            <Power className="h-4 w-4 mr-2" />
            {connectionStatus === 'connecting' ? 'Connexion...' : 'Connecter'}
          </Button>
        )}

        {isConnected && (
          <Button
            onClick={disconnect}
            variant="outline"
            className="w-full"
          >
            <PowerOff className="h-4 w-4 mr-2" />
            Déconnecter
          </Button>
        )}

        {/* Dialer */}
        {isRegistered && (
          <Dialer onCall={makeCall} disabled={!isRegistered} />
        )}

        {/* Not connected message */}
        {!isConnected && !effectiveConfig && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">
              Configuration SIP requise
            </p>
            <p className="text-xs mt-2">
              Veuillez configurer les paramètres SIP ou sélectionner un endpoint
            </p>
          </div>
        )}
      </div>
    );
  };

  // Wrap with appropriate layout
  if (layout === 'fullpage') {
    return (
      <FullPageLayout theme={theme === 'admin' ? 'light' : theme}>
        <CallStatus
          connectionStatus={connectionStatus}
          currentCall={currentCall}
          incomingCall={incomingCall}
        />
        {renderContent()}
      </FullPageLayout>
    );
  }

  // Widget layout (default)
  return (
    <WidgetLayout
      theme={theme}
      onClose={onClose}
      isMinimized={isMinimized}
      onMinimize={setMinimized}
      position={position}
      onPositionChange={setPosition}
    >
      <ConnectedAs />
      <CallStatus
        connectionStatus={connectionStatus}
        currentCall={currentCall}
        incomingCall={incomingCall}
      />
      {renderContent()}
    </WidgetLayout>
  );
}
