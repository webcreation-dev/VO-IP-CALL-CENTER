/**
 * Softphone Module - Public API
 *
 * Main export file for the softphone module
 */

// Main component
export { SoftphoneWidget } from './components/SoftphoneWidget';

// Hooks
export { useSoftphone, useAutoConnect } from './hooks/useSoftphone';

// Store
export { useSoftphoneStore } from './store/softphoneStore';
export {
  useEndpointSelectionStore,
  useSelectedEndpointConfig,
  useHasSelectedEndpoint,
} from './store/endpointSelectionStore';

// Types
export type {
  SipConfig,
  SipCredentials,
  ConnectionStatus,
  CallState,
  CallDirection,
  CallInfo,
  CallRecord,
  CallRecordType,
  AudioDevice,
  AudioSettings,
  SoftphoneState,
  SoftphoneConfig,
  SoftphoneError,
  ConnectionError,
  CallError,
  AudioError,
} from './core/types';

// Components (for custom layouts)
export { Dialer } from './components/Dialer/Dialer';
export { CallControls } from './components/CallControls/CallControls';
export { CallStatus } from './components/CallStatus/CallStatus';
export { IncomingCall } from './components/IncomingCall/IncomingCall';
export { ConnectedAs } from './components/ConnectedAs/ConnectedAs';

// Layouts
export { WidgetLayout } from './layouts/WidgetLayout';
export { FullPageLayout } from './layouts/FullPageLayout';

// Core (advanced usage)
export { SipClient } from './core/SipClient';
export { AudioManager } from './core/AudioManager';
