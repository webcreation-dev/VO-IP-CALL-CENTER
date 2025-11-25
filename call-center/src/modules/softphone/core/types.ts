/**
 * Softphone Core Types
 *
 * TypeScript definitions for the softphone module
 */

// JsSIP types are not properly exported, using any for now
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsSIPSession = any;

// ============================================================================
// SIP Configuration
// ============================================================================

export interface SipConfig {
  server: string;       // e.g., "pishon.kabou.bj"
  port: number;         // e.g., 8089
  username: string;     // SIP authentication username
  password: string;     // SIP password
  displayName?: string; // Display name for outgoing calls
  realm?: string;       // SIP realm (default: asterisk)
}

export interface SipCredentials {
  sipServer: string;
  sipPort: number;
  username: string;
  password: string;
  agentNumber: string;  // For display (e.g., "1000")
  endpointId: string;   // e.g., "t1_1000"
}

// ============================================================================
// Connection State
// ============================================================================

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'registered'
  | 'error';

export interface ConnectionState {
  status: ConnectionStatus;
  error?: string;
  lastConnected?: Date;
  sipConfig?: SipConfig;
}

// ============================================================================
// Call State
// ============================================================================

export type CallState =
  | 'idle'          // No call
  | 'dialing'       // Outgoing call being placed
  | 'ringing'       // Incoming call ringing
  | 'answering'     // Answering incoming call
  | 'in-call'       // Active call
  | 'holding'       // Call on hold
  | 'transferring'  // Transfer in progress
  | 'ending';       // Hanging up

export type CallDirection = 'inbound' | 'outbound';

export interface CallInfo {
  id: string;                    // Unique call ID
  direction: CallDirection;
  remoteNumber: string;          // Called/Calling number
  remoteIdentity?: string;       // Display name
  state: CallState;
  startTime: Date;
  answerTime?: Date;
  endTime?: Date;
  duration: number;              // In seconds
  isMuted: boolean;
  isOnHold: boolean;
  session?: JsSIPSession;        // JsSIP session object
}

// ============================================================================
// Call Record (History)
// ============================================================================

export type CallRecordType = 'answered' | 'missed' | 'rejected' | 'failed';

export interface CallRecord {
  id: string;
  direction: CallDirection;
  remoteNumber: string;
  remoteIdentity?: string;
  type: CallRecordType;
  startTime: Date;
  answerTime?: Date;
  endTime: Date;
  duration: number;              // In seconds
  endReason?: string;            // Cause of call end
}

// ============================================================================
// Audio
// ============================================================================

export interface AudioDevice {
  id: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

export interface AudioSettings {
  selectedMicrophone?: string;   // Device ID
  selectedSpeaker?: string;       // Device ID
  microphoneVolume: number;       // 0-100
  speakerVolume: number;          // 0-100
  enableRingtone: boolean;
  enableRingback: boolean;
  ringtoneUrl?: string;
  ringbackToneUrl?: string;
}

// ============================================================================
// Softphone State (Complete)
// ============================================================================

export interface SoftphoneState {
  // Connection
  connection: ConnectionState;

  // Calls
  currentCall: CallInfo | null;
  incomingCall: CallInfo | null;
  callHistory: CallRecord[];

  // Audio
  audio: AudioSettings;
  availableDevices: AudioDevice[];

  // UI State
  isMinimized: boolean;
  position?: { x: number; y: number };

  // Actions
  connect: (config: SipConfig) => Promise<void>;
  disconnect: () => void;

  makeCall: (number: string) => Promise<void>;
  answerCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  hangup: () => Promise<void>;

  toggleMute: () => void;
  toggleHold: () => void;
  sendDTMF: (digit: string) => void;

  updateAudioSettings: (settings: Partial<AudioSettings>) => void;
  refreshDevices: () => Promise<void>;

  setMinimized: (minimized: boolean) => void;
  setPosition: (position: { x: number; y: number }) => void;

  addToHistory: (call: CallRecord) => void;
  clearHistory: () => void;
}

// ============================================================================
// JsSIP Events
// ============================================================================

export interface SipEvent {
  type: string;
  data?: any;
}

export interface RegisteredEvent {
  response: any;
}

export interface UnregisteredEvent {
  response?: any;
  cause?: string;
}

export interface RegistrationFailedEvent {
  response?: any;
  cause?: string;
}

export interface NewRTCSessionEvent {
  originator: 'local' | 'remote';
  session: JsSIPSession;
  request: any;
}

export interface NewMessageEvent {
  originator: 'local' | 'remote';
  message: any;
  request: any;
}

// ============================================================================
// Configuration
// ============================================================================

export interface SoftphoneConfig {
  sip: SipConfig;
  audio?: Partial<AudioSettings>;
  ui?: {
    theme?: 'light' | 'dark' | 'admin';
    defaultPosition?: { x: number; y: number };
    showHistory?: boolean;
    showSettings?: boolean;
  };
  features?: {
    callRecording?: boolean;
    callTransfer?: boolean;
    conference?: boolean;
    dtmf?: boolean;
  };
  autoConnect?: boolean;
  debug?: boolean;
}

// ============================================================================
// Errors
// ============================================================================

export interface SoftphoneError {
  name: string;
  message: string;
  code?: string;
  details?: any;
}

export interface ConnectionError extends SoftphoneError {
  name: 'ConnectionError';
  code: 'CONNECTION_ERROR';
}

export interface CallError extends SoftphoneError {
  name: 'CallError';
  code: 'CALL_ERROR';
}

export interface AudioError extends SoftphoneError {
  name: 'AudioError';
  code: 'AUDIO_ERROR';
}
