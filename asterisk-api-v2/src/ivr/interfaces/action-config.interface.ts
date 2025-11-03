// interfaces/action-config.interface.ts
export type ActionConfig =
  | QueueAction
  | EndpointAction
  | SubmenuAction
  | PlaybackAction
  | HangupAction
  | VoicemailAction
  | CallbackAction
  | ExternalApiAction;

export interface BaseAction {
  type: string;
}

export interface QueueAction extends BaseAction {
  type: 'queue';
  target: string; // UUID de la queue
  announce?: string; // Son à jouer avant mise en queue
  timeout?: number; // Timeout spécifique
}

export interface EndpointAction extends BaseAction {
  type: 'endpoint';
  target: string; // UUID de l'endpoint
  timeout?: number; // Durée de sonnerie max
}

export interface SubmenuAction extends BaseAction {
  type: 'submenu';
  target: string; // UUID du sous-menu
}

export interface PlaybackAction extends BaseAction {
  type: 'playback';
  sounds: string[]; // Liste de fichiers audio
  then?: ActionConfig; // Action suivante
}

export interface HangupAction extends BaseAction {
  type: 'hangup';
  cause?: string; // Cause du hangup (optionnel)
}

export interface VoicemailAction extends BaseAction {
  type: 'voicemail';
  mailbox: string; // Format: "101@default"
}

export interface CallbackAction extends BaseAction {
  type: 'callback';
  queue_id: string; // Queue pour le callback
  message?: string; // Message de confirmation
}

export interface ExternalApiAction extends BaseAction {
  type: 'external_api';
  url: string; // URL du webhook
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: Record<string, any>;
  then?: ActionConfig; // Action selon réponse
}

// Type guards pour vérifier le type d'action
export function isQueueAction(action: ActionConfig): action is QueueAction {
  return action.type === 'queue';
}

export function isEndpointAction(action: ActionConfig): action is EndpointAction {
  return action.type === 'endpoint';
}

export function isSubmenuAction(action: ActionConfig): action is SubmenuAction {
  return action.type === 'submenu';
}

export function isPlaybackAction(action: ActionConfig): action is PlaybackAction {
  return action.type === 'playback';
}

export function isCallbackAction(action: ActionConfig): action is CallbackAction {
  return action.type === 'callback';
}

export function isExternalApiAction(action: ActionConfig): action is ExternalApiAction {
  return action.type === 'external_api';
}