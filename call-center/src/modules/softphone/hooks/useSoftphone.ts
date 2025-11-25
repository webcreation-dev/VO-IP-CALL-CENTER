/**
 * useSoftphone Hook
 *
 * Main React hook for using the softphone in components
 * Provides a clean API to interact with the softphone store
 */

import { useSoftphoneStore } from '../store/softphoneStore';
import type { SipConfig } from '../core/types';

export function useSoftphone() {
  const store = useSoftphoneStore();

  return {
    // Connection state
    connectionStatus: store.connection.status,
    isConnected: store.connection.status === 'connected' || store.connection.status === 'registered',
    isRegistered: store.connection.status === 'registered',
    connectionError: store.connection.error,

    // Call state
    currentCall: store.currentCall,
    incomingCall: store.incomingCall,
    isInCall: store.currentCall !== null,
    hasIncomingCall: store.incomingCall !== null,
    callState: store.currentCall?.state || 'idle',

    // Audio
    audioSettings: store.audio,
    availableDevices: store.availableDevices,

    // UI
    isMinimized: store.isMinimized,
    position: store.position,

    // History
    callHistory: store.callHistory,

    // Actions - Connection
    connect: store.connect,
    disconnect: store.disconnect,

    // Actions - Calls
    makeCall: store.makeCall,
    answerCall: store.answerCall,
    rejectCall: store.rejectCall,
    hangup: store.hangup,

    // Actions - Call Controls
    toggleMute: store.toggleMute,
    toggleHold: store.toggleHold,
    sendDTMF: store.sendDTMF,

    // Actions - Audio
    updateAudioSettings: store.updateAudioSettings,
    refreshDevices: store.refreshDevices,

    // Actions - UI
    setMinimized: store.setMinimized,
    setPosition: store.setPosition,

    // Actions - History
    clearHistory: store.clearHistory,
  };
}

/**
 * Hook for auto-connecting with provided credentials
 */
export function useAutoConnect(sipConfig: SipConfig | null, enabled = true) {
  const { connect, isConnected } = useSoftphone();

  React.useEffect(() => {
    if (enabled && sipConfig && !isConnected) {
      connect(sipConfig).catch((error) => {
        console.error('Auto-connect failed:', error);
      });
    }
  }, [enabled, sipConfig, isConnected, connect]);
}

// Re-export React for the useEffect above
import React from 'react';
