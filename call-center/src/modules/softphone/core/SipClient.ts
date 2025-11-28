/**
 * SipClient - JsSIP Wrapper
 *
 * Encapsulates JsSIP logic for WebRTC/SIP communication with Asterisk
 * Based on the working implementation in webrtc.html
 */

import JsSIP from 'jssip';
import type {
  SipConfig,
  CallInfo,
  CallDirection,
} from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsSIPUA = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsSIPSession = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsSIPConfig = any;

// ============================================================================
// Event Emitter Pattern for React Integration
// ============================================================================

type EventCallback = (...args: any[]) => void;

interface EventMap {
  connectionStateChanged: (state: string) => void;
  registered: () => void;
  unregistered: (cause?: string) => void;
  registrationFailed: (cause?: string) => void;
  incomingCall: (call: CallInfo) => void;
  callStateChanged: (call: CallInfo) => void;
  callEnded: (callId: string, cause: string) => void;
  error: (error: Error) => void;
}

// ============================================================================
// SipClient Class
// ============================================================================

export class SipClient {
  private ua: JsSIPUA | null = null;
  private currentSession: JsSIPSession | null = null;
  private remoteAudio: HTMLAudioElement;
  private config: SipConfig | null = null;
  private eventListeners: Map<string, EventCallback[]> = new Map();

  constructor() {
    // Create audio element for remote audio
    this.remoteAudio = document.createElement('audio');
    this.remoteAudio.autoplay = true;
    this.remoteAudio.volume = 1.0;
  }

  // ==========================================================================
  // Event Emitter Implementation
  // ==========================================================================

  on<K extends keyof EventMap>(event: K, callback: EventMap[K]): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback as EventCallback);
  }

  off<K extends keyof EventMap>(event: K, callback: EventMap[K]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback as EventCallback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit<K extends keyof EventMap>(
    event: K,
    ...args: Parameters<EventMap[K]>
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(...args));
    }
  }

  // ==========================================================================
  // Connection Management
  // ==========================================================================

  async connect(config: SipConfig): Promise<void> {
    try {
      this.config = config;

      // ========================================================================
      // DEBUG: Log received SIP configuration
      // ========================================================================
      console.log('╔═══════════════════════════════════════════════════════════════╗');
      console.log('║           🔍 SIP CLIENT DEBUG - CONFIGURATION                 ║');
      console.log('╚═══════════════════════════════════════════════════════════════╝');
      console.log('📋 Received SIP Config:', {
        server: config.server,
        domain: config.domain,
        port: config.port,
        username: config.username,
        endpointId: config.endpointId,
        password: config.password ? `${config.password.substring(0, 3)}***${config.password.substring(config.password.length - 3)}` : '(empty)',
        passwordLength: config.password?.length || 0,
        displayName: config.displayName,
        realm: config.realm,
      });
      console.log('');

      // Request microphone permissions first
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      // Stop the stream immediately (we just needed permissions)
      stream.getTracks().forEach((track) => track.stop());

      // Configure WebSocket - Use domain for SSL certificate validity
      // SSL certificates are issued for domain names, not IP addresses
      const wsUri = `wss://${config.domain}:${config.port}/ws`;

      // ========================================================================
      // DEBUG: Log WebSocket URI
      // ========================================================================
      console.log('╔═══════════════════════════════════════════════════════════════╗');
      console.log('║           🌐 SIP CLIENT DEBUG - WEBSOCKET                     ║');
      console.log('╚═══════════════════════════════════════════════════════════════╝');
      console.log('🔗 WebSocket URI:', wsUri);
      console.log('');

      const socket = new JsSIP.WebSocketInterface(wsUri);

      // Configure User Agent - Match working OMAI/sipML5 softphone configuration
      // Uses dual identity: Public Identity (endpoint ID in URI) + Private Identity (hash for auth)
      // Based on captured working SIP REGISTER:
      //   From: "Boris"<sip:t24_1000@pishon.kabou.bj>
      //   Authorization: Digest username="c427673b525e7eb9496ed64cafc6315c",realm="asterisk"
      const sipDomain = config.domain || config.server;
      const sipUri = `sip:${config.endpointId}@${sipDomain}`;  // Public Identity: sip:t24_1000@pishon.kabou.bj

      const uaConfig: JsSIPConfig = {
        sockets: [socket],
        uri: sipUri,                                    // Public Identity (endpoint ID)
        authorization_user: config.username,            // Private Identity (hash for Digest auth)
        password: config.password,
        display_name: config.displayName || config.endpointId,
        register: true,
        session_timers: false,
        pcConfig: {
          iceServers: [
            // TURN first - provides relay candidates immediately
            {
              urls: [
                'turn:pishon.kabou.bj:3478?transport=udp',
                'turn:pishon.kabou.bj:3478?transport=tcp',
              ],
              username: 'webrtcuser',
              credential: 'secretpassword',
            },
            // STUN as fallback for direct connection
            { urls: 'stun:pishon.kabou.bj:3478' },
            { urls: 'stun:stun.l.google.com:19302' },
          ],
          iceCandidatePoolSize: 10,
          iceTransportPolicy: 'relay', // Force TURN only - skip STUN timeout
        },
        // Increase reconnection intervals to avoid excessive retries
        connection_recovery_min_interval: 4,
        connection_recovery_max_interval: 60,
        register_expires: 600,
        // DO NOT specify realm - JsSIP will use "asterisk" from 401 challenge automatically
      };

      // ========================================================================
      // DEBUG: Log JsSIP User Agent Configuration
      // ========================================================================
      console.log('╔═══════════════════════════════════════════════════════════════╗');
      console.log('║           📞 SIP CLIENT DEBUG - JSSIP CONFIG                  ║');
      console.log('╚═══════════════════════════════════════════════════════════════╝');
      console.log('🔧 JsSIP UA Config:', {
        uri: sipUri,
        authorization_user: config.username,
        password: config.password ? `***${config.password.substring(config.password.length - 4)}` : '(empty)',
        display_name: config.displayName || config.endpointId,
        register: true,
        register_expires: 600,
        connection_recovery_min_interval: 4,
        connection_recovery_max_interval: 60,
      });
      console.log('');
      console.log('📝 Expected SIP REGISTER Message Format (like OMAI/sipML5):');
      console.log('   From/To: "' + (config.displayName || config.endpointId) + '"<' + sipUri + '>');
      console.log('   Authorization: Digest username="' + config.username + '",realm="asterisk",...');
      console.log('');
      console.log('╔═══════════════════════════════════════════════════════════════╗');
      console.log('║           ⚙️  STARTING JSSIP USER AGENT                       ║');
      console.log('╚═══════════════════════════════════════════════════════════════╝');
      console.log('');

      this.ua = new JsSIP.UA(uaConfig);

      // Setup UA event handlers
      this.setupUAEventHandlers();

      // Start the UA
      this.ua.start();

      this.log('✅ SIP Client initialized');
    } catch (error: any) {
      console.log('');
      console.log('╔═══════════════════════════════════════════════════════════════╗');
      console.log('║           ❌ SIP CLIENT DEBUG - ERROR                         ║');
      console.log('╚═══════════════════════════════════════════════════════════════╝');
      console.error('💥 Connection Error:', error);
      console.log('');

      this.log('❌ Connection failed: ' + error.message);
      this.emit('error', error);
      throw error;
    }
  }

  disconnect(): void {
    if (this.currentSession) {
      this.currentSession.terminate();
      this.currentSession = null;
    }

    if (this.ua) {
      // Désenregistrer explicitement avant de stopper pour éviter
      // que JsSIP ne tente de se ré-enregistrer
      try {
        this.ua.unregister({ all: true });
      } catch (e) {
        // Ignorer si déjà désenregistré
      }
      this.ua.stop();
      this.ua = null;
    }

    this.emit('connectionStateChanged', 'disconnected');
    this.log('🔴 Disconnected');
  }

  isConnected(): boolean {
    return this.ua !== null && this.ua.isConnected();
  }

  isRegistered(): boolean {
    return this.ua !== null && this.ua.isRegistered();
  }

  // ==========================================================================
  // Call Operations
  // ==========================================================================

  async makeCall(number: string): Promise<void> {
    if (!this.ua || !this.isRegistered()) {
      throw new Error('Not connected or registered');
    }

    if (this.currentSession) {
      throw new Error('A call is already in progress');
    }

    try {
      // Use domain for SIP URI, not the server IP
      const sipDomain = this.config!.domain || this.config!.server;
      const target = `sip:${number}@${sipDomain}`;

      const options = {
        mediaConstraints: {
          audio: true,
          video: false,
        },
        pcConfig: {
          iceServers: [
            // TURN first - provides relay candidates immediately
            {
              urls: [
                'turn:pishon.kabou.bj:3478?transport=udp',
                'turn:pishon.kabou.bj:3478?transport=tcp',
              ],
              username: 'webrtcuser',
              credential: 'secretpassword',
            },
            // STUN as fallback for direct connection
            { urls: 'stun:pishon.kabou.bj:3478' },
            { urls: 'stun:stun.l.google.com:19302' },
          ],
          iceCandidatePoolSize: 10,
          iceTransportPolicy: 'relay', // Force TURN only - skip STUN timeout
        },
        rtcOfferConstraints: {
          iceRestart: true,
        },
        // Stop ICE gathering as soon as we have a relay candidate
        eventHandlers: {
          icecandidate: (event: any) => {
            if (event.candidate && event.candidate.type === 'relay') {
              console.log('🟢 Candidat RELAY reçu, arrêt du gathering ICE');
              event.ready();
            }
          },
        },
      };

      this.log(`📞 Calling ${number}...`);
      this.currentSession = this.ua.call(target, options);

      if (this.currentSession) {
        this.attachSessionHandlers(this.currentSession, 'outbound', number);
      }
    } catch (error: any) {
      this.log('❌ Call failed: ' + error.message);
      this.emit('error', error);
      throw error;
    }
  }

  answerCall(): void {
    if (!this.currentSession) {
      throw new Error('No incoming call to answer');
    }

    try {
      this.log('✅ Answering call');
      this.currentSession.answer({
        mediaConstraints: {
          audio: true,
          video: false,
        },
        pcConfig: {
          iceServers: [
            // TURN first - provides relay candidates immediately
            {
              urls: [
                'turn:pishon.kabou.bj:3478?transport=udp',
                'turn:pishon.kabou.bj:3478?transport=tcp',
              ],
              username: 'webrtcuser',
              credential: 'secretpassword',
            },
            // STUN as fallback for direct connection
            { urls: 'stun:pishon.kabou.bj:3478' },
            { urls: 'stun:stun.l.google.com:19302' },
          ],
          iceCandidatePoolSize: 10,
          iceTransportPolicy: 'relay', // Force TURN only - skip STUN timeout
        },
        // Stop ICE gathering as soon as we have a relay candidate
        eventHandlers: {
          icecandidate: (event: any) => {
            if (event.candidate && event.candidate.type === 'relay') {
              console.log('🟢 Candidat RELAY reçu, arrêt du gathering ICE');
              event.ready();
            }
          },
        },
      });
    } catch (error: any) {
      this.log('❌ Answer failed: ' + error.message);
      this.emit('error', error);
      throw error;
    }
  }

  rejectCall(): void {
    if (!this.currentSession) {
      throw new Error('No incoming call to reject');
    }

    try {
      this.log('❌ Rejecting call');
      this.currentSession.terminate();
      this.currentSession = null;
    } catch (error: any) {
      this.log('❌ Reject failed: ' + error.message);
      this.emit('error', error);
      throw error;
    }
  }

  hangup(): void {
    if (!this.currentSession) {
      return;
    }

    try {
      this.log('📞 Hanging up');
      this.currentSession.terminate();
      this.currentSession = null;
    } catch (error: any) {
      this.log('❌ Hangup failed: ' + error.message);
      this.emit('error', error);
      throw error;
    }
  }

  // ==========================================================================
  // Call Controls
  // ==========================================================================

  mute(): void {
    if (!this.currentSession) {
      return;
    }

    try {
      this.currentSession.mute({ audio: true });
      this.log('🔇 Muted');
    } catch (error: any) {
      this.log('❌ Mute failed: ' + error.message);
    }
  }

  unmute(): void {
    if (!this.currentSession) {
      return;
    }

    try {
      this.currentSession.unmute({ audio: true });
      this.log('🔊 Unmuted');
    } catch (error: any) {
      this.log('❌ Unmute failed: ' + error.message);
    }
  }

  hold(): void {
    if (!this.currentSession) {
      return;
    }

    try {
      this.currentSession.hold();
      this.log('⏸️ Call on hold');
    } catch (error: any) {
      this.log('❌ Hold failed: ' + error.message);
    }
  }

  unhold(): void {
    if (!this.currentSession) {
      return;
    }

    try {
      this.currentSession.unhold();
      this.log('▶️ Call resumed');
    } catch (error: any) {
      this.log('❌ Unhold failed: ' + error.message);
    }
  }

  sendDTMF(digit: string): void {
    if (!this.currentSession) {
      return;
    }

    try {
      this.currentSession.sendDTMF(digit);
      this.log(`🔢 DTMF sent: ${digit}`);
    } catch (error: any) {
      this.log('❌ DTMF failed: ' + error.message);
    }
  }

  // ==========================================================================
  // UA Event Handlers
  // ==========================================================================

  private setupUAEventHandlers(): void {
    if (!this.ua) return;

    this.ua.on('connecting', () => {
      this.log('🔵 Connecting...');
      this.emit('connectionStateChanged', 'connecting');
    });

    this.ua.on('connected', () => {
      this.log('✅ Connected');
      this.emit('connectionStateChanged', 'connected');
    });

    this.ua.on('disconnected', () => {
      this.log('🔴 Disconnected');
      this.emit('connectionStateChanged', 'disconnected');
    });

    this.ua.on('registered', () => {
      this.log('✅ Registered');
      this.emit('registered');
      this.emit('connectionStateChanged', 'registered');
    });

    this.ua.on('unregistered', (data: any) => {
      const cause = data?.cause || 'Unknown';
      this.log(`🔴 Unregistered: ${cause}`);
      this.emit('unregistered', cause);
    });

    this.ua.on('registrationFailed', (data: any) => {
      const cause = data?.cause || 'Unknown';
      this.log(`❌ Registration failed: ${cause}`);
      this.emit('registrationFailed', cause);
      this.emit('error', new Error(`Registration failed: ${cause}`));
    });

    this.ua.on('newRTCSession', (data: any) => {
      const { originator, session } = data;

      if (originator === 'remote') {
        // Incoming call
        this.log('📞 Incoming call');
        this.currentSession = session;

        const remoteIdentity = session.remote_identity.display_name ||
                               session.remote_identity.uri.user;

        this.attachSessionHandlers(session, 'inbound', remoteIdentity);

        // Emit incoming call event
        const callInfo = this.createCallInfo(session, 'inbound', remoteIdentity);
        this.emit('incomingCall', callInfo);
      }
    });

    this.ua.on('newMessage', (data: any) => {
      this.log('💬 New message received');
    });
  }

  // ==========================================================================
  // Session Event Handlers
  // ==========================================================================

  private attachSessionHandlers(
    session: JsSIPSession,
    direction: CallDirection,
    remoteNumber: string
  ): void {
    this.log('🔧 Attaching session handlers');

    // Handle PeerConnection
    if (session.connection) {
      this.setupPeerConnectionHandlers(session.connection);
    }

    session.on('peerconnection', (data: any) => {
      this.setupPeerConnectionHandlers(data.peerconnection);
    });

    session.on('progress', () => {
      this.log('📞 Call progressing...');
      const callInfo = this.createCallInfo(session, direction, remoteNumber);
      callInfo.state = 'dialing';
      this.emit('callStateChanged', callInfo);
    });

    session.on('accepted', () => {
      this.log('✅ Call accepted');
      const callInfo = this.createCallInfo(session, direction, remoteNumber);
      callInfo.state = 'in-call';
      callInfo.answerTime = new Date();
      this.emit('callStateChanged', callInfo);
    });

    session.on('confirmed', () => {
      this.log('✅ Call confirmed');
    });

    session.on('ended', (data: any) => {
      const cause = data?.cause || 'Normal clearing';
      this.log(`📞 Call ended: ${cause}`);

      const callId = session.id;
      this.currentSession = null;
      this.emit('callEnded', callId, cause);
    });

    session.on('failed', (data: any) => {
      const cause = data?.cause || 'Unknown error';
      this.log(`❌ Call failed: ${cause}`);

      const callId = session.id;
      this.currentSession = null;
      this.emit('callEnded', callId, cause);
      this.emit('error', new Error(`Call failed: ${cause}`));
    });

    session.on('hold', (data: any) => {
      this.log('⏸️ Call on hold');
      const callInfo = this.createCallInfo(session, direction, remoteNumber);
      callInfo.state = 'holding';
      callInfo.isOnHold = true;
      this.emit('callStateChanged', callInfo);
    });

    session.on('unhold', (data: any) => {
      this.log('▶️ Call resumed');
      const callInfo = this.createCallInfo(session, direction, remoteNumber);
      callInfo.state = 'in-call';
      callInfo.isOnHold = false;
      this.emit('callStateChanged', callInfo);
    });

    session.on('muted', (data: any) => {
      this.log('🔇 Muted');
    });

    session.on('unmuted', (data: any) => {
      this.log('🔊 Unmuted');
    });
  }

  // ==========================================================================
  // PeerConnection Handlers (WebRTC)
  // ==========================================================================

  private setupPeerConnectionHandlers(peerConnection: RTCPeerConnection): void {
    this.log('🔵 Setting up RTCPeerConnection handlers');
    this.log(`🔵 ICE Connection State: ${peerConnection.iceConnectionState}`);
    this.log(`🔵 Signaling State: ${peerConnection.signalingState}`);

    // DEBUG: Log ICE configuration being used
    const config = peerConnection.getConfiguration();
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║           🧊 ICE CONFIGURATION DEBUG                          ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('🔧 ICE Servers:', JSON.stringify(config.iceServers, null, 2));
    console.log('🔧 ICE Transport Policy:', config.iceTransportPolicy);
    console.log('🔧 ICE Candidate Pool Size:', config.iceCandidatePoolSize);

    // Track ICE gathering time
    const iceStartTime = Date.now();

    // Log ICE gathering state changes
    peerConnection.onicegatheringstatechange = () => {
      const elapsed = ((Date.now() - iceStartTime) / 1000).toFixed(2);
      this.log(`🧊 ICE Gathering State: ${peerConnection.iceGatheringState} (${elapsed}s)`);
      if (peerConnection.iceGatheringState === 'complete') {
        console.log(`✅ ICE Gathering completed in ${elapsed} seconds`);
      }
    };

    // Log each ICE candidate as it's discovered
    peerConnection.onicecandidate = (event) => {
      const elapsed = ((Date.now() - iceStartTime) / 1000).toFixed(2);
      if (event.candidate) {
        const candidateStr = event.candidate.candidate;
        const type = candidateStr.includes('typ relay') ? '🟢 RELAY' :
                     candidateStr.includes('typ srflx') ? '🟡 SRFLX' :
                     candidateStr.includes('typ host') ? '🔵 HOST' : '⚪ OTHER';
        console.log(`🧊 [${elapsed}s] ICE Candidate ${type}:`, candidateStr);
      } else {
        console.log(`🧊 [${elapsed}s] ICE Candidate gathering finished (null candidate)`);
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      this.log(`🔵 ICE Connection State: ${peerConnection.iceConnectionState}`);
      if (
        peerConnection.iceConnectionState === 'connected' ||
        peerConnection.iceConnectionState === 'completed'
      ) {
        this.log('✅ ICE Connected - Media should flow now');
      }
    };

    peerConnection.ontrack = (event: RTCTrackEvent) => {
      this.log(`🎵 Track received: ${event.track.kind}`);
      this.log(`🎵 Track readyState: ${event.track.readyState}`);

      if (event.streams && event.streams[0]) {
        const stream = event.streams[0];
        this.log(`🎵 Stream active: ${stream.active}`);

        // Enable the track
        event.track.enabled = true;

        // Attach to audio element
        this.remoteAudio.srcObject = stream;
        this.remoteAudio.volume = 1.0;
        this.remoteAudio.muted = false;

        // Play
        this.remoteAudio
          .play()
          .then(() => {
            this.log('✅ Audio playback started');
          })
          .catch((err) => {
            this.log('❌ Audio playback failed: ' + err.message);
          });
      }
    };
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  private createCallInfo(
    session: JsSIPSession,
    direction: CallDirection,
    remoteNumber: string
  ): CallInfo {
    return {
      id: session.id,
      direction,
      remoteNumber,
      remoteIdentity: session.remote_identity?.display_name || remoteNumber,
      state: 'idle',
      startTime: session.start_time || new Date(),
      duration: 0,
      isMuted: false,
      isOnHold: false,
      session,
    };
  }

  private log(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[SipClient ${timestamp}] ${message}`);
  }

  // ==========================================================================
  // Getters
  // ==========================================================================

  getCurrentSession(): JsSIPSession | null {
    return this.currentSession;
  }

  getRemoteAudioElement(): HTMLAudioElement {
    return this.remoteAudio;
  }

  getConfig(): SipConfig | null {
    return this.config;
  }
}
