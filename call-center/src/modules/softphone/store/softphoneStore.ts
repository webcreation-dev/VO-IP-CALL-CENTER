/**
 * Softphone Store - Zustand
 *
 * Global state management for the softphone module
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SipClient } from '../core/SipClient';
import { AudioManager } from '../core/AudioManager';
import callsService, { ChannelState } from '@/api/calls';
import type {
  SipConfig,
  CallInfo,
  CallRecord,
  AudioSettings,
  AudioDevice,
  ConnectionStatus,
  SoftphoneState,
} from '../core/types';

// Singleton instances
let sipClient: SipClient | null = null;
let audioManager: AudioManager | null = null;
let eventListenersAttached = false;

// Get or create SipClient instance
function getSipClient(): SipClient {
  if (!sipClient) {
    sipClient = new SipClient();
    eventListenersAttached = false; // Reset flag when new client is created
  }
  return sipClient;
}

// Get or create AudioManager instance
function getAudioManager(): AudioManager {
  if (!audioManager) {
    audioManager = new AudioManager();
  }
  return audioManager;
}

// ============================================================================
// Store Definition
// ============================================================================

interface SoftphoneStoreState extends SoftphoneState {
  // Additional internal state
  _callStartTime: Date | null;
  _callTimer: ReturnType<typeof setInterval> | null;
}

export const useSoftphoneStore = create<SoftphoneStoreState>()(
  persist(
    (set, get) => ({
      // =======================================================================
      // Initial State
      // =======================================================================

      connection: {
        status: 'disconnected' as ConnectionStatus,
      },

      currentCall: null,
      incomingCall: null,
      callHistory: [],

      audio: {
        microphoneVolume: 80,
        speakerVolume: 80,
        enableRingtone: true,
        enableRingback: true,
      },

      availableDevices: [],

      isMinimized: false,
      position: undefined,

      _callStartTime: null,
      _callTimer: null,

      // =======================================================================
      // Connection Actions
      // =======================================================================

      connect: async (config: SipConfig) => {
        try {
          const client = getSipClient();

          // Prevent connecting if already connected or connecting
          const currentStatus = get().connection.status;
          if (currentStatus === 'connecting' || currentStatus === 'connected' || currentStatus === 'registered') {
            console.log('[SoftphoneStore] Already connected or connecting, skipping connect()');
            return;
          }

          // Only setup event listeners once to prevent duplicate handlers
          if (!eventListenersAttached) {
            eventListenersAttached = true;

            client.on('connectionStateChanged', (status: string) => {
            set({
              connection: {
                ...get().connection,
                status: status as ConnectionStatus,
              },
            });
          });

          client.on('registered', () => {
            set({
              connection: {
                status: 'registered',
                sipConfig: config,
                lastConnected: new Date(),
              },
            });
          });

          client.on('unregistered', (cause?: string) => {
            set({
              connection: {
                status: 'disconnected',
                error: cause,
              },
            });
          });

          client.on('registrationFailed', (cause?: string) => {
            set({
              connection: {
                status: 'error',
                error: cause || 'Registration failed',
              },
            });
          });

          client.on('incomingCall', (call: CallInfo) => {
            set({ incomingCall: call });

            // Play ringtone
            const { audio } = get();
            if (audio.enableRingtone) {
              getAudioManager().playRingtone();
            }
          });

          client.on('callStateChanged', (call: CallInfo) => {
            const state = get();

            if (call.state === 'in-call') {
              // Call answered
              getAudioManager().stopRingtone();
              getAudioManager().stopRingback();

              // Start call timer
              const timer = setInterval(() => {
                const startTime = get()._callStartTime;
                if (startTime) {
                  const duration = Math.floor(
                    (Date.now() - startTime.getTime()) / 1000
                  );
                  set((state) => ({
                    currentCall: state.currentCall
                      ? { ...state.currentCall, duration }
                      : null,
                  }));
                }
              }, 1000);

              set({
                currentCall: call,
                incomingCall: null,
                _callStartTime: call.answerTime || new Date(),
                _callTimer: timer,
              });
            } else if (call.state === 'dialing') {
              // Outgoing call progressing
              const { audio } = get();
              if (audio.enableRingback) {
                getAudioManager().playRingback();
              }

              set({ currentCall: call });
            } else {
              // Other states
              set({ currentCall: call });
            }
          });

          client.on('callEnded', (callId: string, cause: string) => {
            // Stop audio
            getAudioManager().stopRingtone();
            getAudioManager().stopRingback();

            // Stop timer
            const { _callTimer, currentCall } = get();
            if (_callTimer) {
              clearInterval(_callTimer);
            }

            // Add to history
            if (currentCall) {
              const record: CallRecord = {
                id: currentCall.id,
                direction: currentCall.direction,
                remoteNumber: currentCall.remoteNumber,
                remoteIdentity: currentCall.remoteIdentity,
                type: cause === 'Normal Clearing' ? 'answered' : 'failed',
                startTime: currentCall.startTime,
                answerTime: currentCall.answerTime,
                endTime: new Date(),
                duration: currentCall.duration,
                endReason: cause,
              };
              get().addToHistory(record);
            }

            set({
              currentCall: null,
              incomingCall: null,
              _callStartTime: null,
              _callTimer: null,
            });
          });

          client.on('error', (error: Error) => {
            console.error('Softphone error:', error);
            set({
              connection: {
                ...get().connection,
                error: error.message,
              },
            });
          });
          } // End of eventListenersAttached check

          // Connect
          set({
            connection: {
              status: 'connecting',
            },
          });

          await client.connect(config);

          // Refresh audio devices
          await get().refreshDevices();
        } catch (error: any) {
          set({
            connection: {
              status: 'error',
              error: error.message,
            },
          });
          throw error;
        }
      },

      disconnect: () => {
        const client = getSipClient();
        client.disconnect();

        // Stop timer
        const { _callTimer } = get();
        if (_callTimer) {
          clearInterval(_callTimer);
        }

        // Stop audio
        getAudioManager().stopRingtone();
        getAudioManager().stopRingback();

        set({
          connection: {
            status: 'disconnected',
          },
          currentCall: null,
          incomingCall: null,
          _callStartTime: null,
          _callTimer: null,
        });
      },

      // =======================================================================
      // Call Actions
      // =======================================================================

      makeCall: async (number: string) => {
        try {
          const client = getSipClient();
          await client.makeCall(number);
        } catch (error) {
          console.error('Make call error:', error);
          throw error;
        }
      },

      answerCall: async () => {
        try {
          const client = getSipClient();
          client.answerCall();

          // Stop ringtone
          getAudioManager().stopRingtone();
        } catch (error) {
          console.error('Answer call error:', error);
          throw error;
        }
      },

      rejectCall: async () => {
        try {
          const client = getSipClient();
          client.rejectCall();

          // Stop ringtone
          getAudioManager().stopRingtone();

          // Clear incoming call
          set({ incomingCall: null });
        } catch (error) {
          console.error('Reject call error:', error);
          throw error;
        }
      },

      hangup: async () => {
        try {
          const client = getSipClient();
          client.hangup();

          // Audio will be stopped by callEnded event
        } catch (error) {
          console.error('Hangup error:', error);
          throw error;
        }
      },

      // =======================================================================
      // Call Controls
      // =======================================================================

      toggleMute: () => {
        const { currentCall } = get();
        if (!currentCall) return;

        const client = getSipClient();
        if (currentCall.isMuted) {
          client.unmute();
          set({
            currentCall: { ...currentCall, isMuted: false },
          });
        } else {
          client.mute();
          set({
            currentCall: { ...currentCall, isMuted: true },
          });
        }
      },

      toggleHold: () => {
        const { currentCall } = get();
        if (!currentCall) return;

        const client = getSipClient();
        if (currentCall.isOnHold) {
          client.unhold();
          // State will be updated by callStateChanged event
        } else {
          client.hold();
          // State will be updated by callStateChanged event
        }
      },

      sendDTMF: (digit: string) => {
        const client = getSipClient();
        client.sendDTMF(digit);
      },

      blindTransfer: async (extension: string, context: string = 'from-internal') => {
        const { currentCall, connection } = get();

        if (!currentCall) {
          throw new Error('Aucun appel actif à transférer');
        }

        // Get the channel name - either from the call info or fetch from API
        let channelName = currentCall.channelName;

        if (!channelName) {
          // Fetch active channel from API using the endpoint ID
          const sipConfig = connection.sipConfig;
          if (!sipConfig?.endpointId) {
            throw new Error('Configuration SIP non disponible');
          }

          try {
            const channels = await callsService.getAllChannels();
            // Find the channel that matches our endpoint
            const activeChannel = channels.find(
              (ch) =>
                ch.name.includes(sipConfig.endpointId) &&
                (ch.state === ChannelState.UP || ch.state === ChannelState.RINGING)
            );

            if (!activeChannel) {
              throw new Error('Canal actif non trouvé');
            }

            channelName = activeChannel.name;

            // Store channelName for future use
            set({
              currentCall: { ...currentCall, channelName },
            });
          } catch (error) {
            console.error('Failed to fetch channel:', error);
            throw new Error('Impossible de récupérer le canal actif');
          }
        }

        // Perform the blind transfer
        await callsService.blindTransfer({
          channelName,
          extension,
          context,
        });

        // The call will be terminated by Asterisk after successful transfer
        // The callEnded event will clean up the state
      },

      // =======================================================================
      // Audio Actions
      // =======================================================================

      updateAudioSettings: (settings: Partial<AudioSettings>) => {
        const currentSettings = get().audio;
        const newSettings = { ...currentSettings, ...settings };

        // Apply volume changes
        const manager = getAudioManager();
        if (settings.speakerVolume !== undefined) {
          manager.setRingtoneVolume(settings.speakerVolume);
          manager.setRingbackVolume(settings.speakerVolume);
        }

        // Apply ringtone URL
        if (settings.ringtoneUrl) {
          manager.setRingtoneUrl(settings.ringtoneUrl);
        }

        if (settings.ringbackToneUrl) {
          manager.setRingbackUrl(settings.ringbackToneUrl);
        }

        set({ audio: newSettings });
      },

      refreshDevices: async () => {
        try {
          const manager = getAudioManager();
          const { microphones, speakers } = await manager.getAudioDevices();

          const devices: AudioDevice[] = [...microphones, ...speakers];
          set({ availableDevices: devices });
        } catch (error) {
          console.error('Failed to refresh audio devices:', error);
        }
      },

      // =======================================================================
      // UI Actions
      // =======================================================================

      setMinimized: (minimized: boolean) => {
        set({ isMinimized: minimized });
      },

      setPosition: (position: { x: number; y: number }) => {
        set({ position });
      },

      // =======================================================================
      // History Actions
      // =======================================================================

      addToHistory: (call: CallRecord) => {
        set((state) => ({
          callHistory: [call, ...state.callHistory].slice(0, 100), // Keep last 100 calls
        }));
      },

      clearHistory: () => {
        set({ callHistory: [] });
      },
    }),
    {
      name: 'softphone-storage',
      partialize: (state) => ({
        // Only persist these fields
        audio: state.audio,
        callHistory: state.callHistory,
        isMinimized: state.isMinimized,
        position: state.position,
        // Do NOT persist connection state or credentials
      }),
    }
  )
);

// ============================================================================
// Cleanup on page unload
// ============================================================================

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (sipClient) {
      sipClient.disconnect();
    }
    if (audioManager) {
      audioManager.destroy();
    }
  });
}
