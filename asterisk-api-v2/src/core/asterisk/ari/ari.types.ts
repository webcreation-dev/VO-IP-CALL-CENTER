/**
 * ARI Channel interface
 */
export interface AriChannel {
  id: string;
  name: string;
  state: string;
  caller: {
    name: string;
    number: string;
  };
  connected: {
    name: string;
    number: string;
  };
  accountcode: string;
  dialplan: {
    context: string;
    exten: string;
    priority: number;
  };
  creationtime: string;
  language: string;
}

/**
 * ARI Bridge interface
 */
export interface AriBridge {
  id: string;
  technology: string;
  bridge_type: string;
  bridge_class: string;
  creator: string;
  name: string;
  channels: string[];
}

/**
 * ARI Playback interface
 */
export interface AriPlayback {
  id: string;
  media_uri: string;
  target_uri: string;
  language: string;
  state: string;
}

/**
 * ARI Recording interface
 */
export interface AriRecording {
  name: string;
  format: string;
  state: string;
  duration?: number;
  talking_duration?: number;
  silence_duration?: number;
}

/**
 * Originate Call options
 */
export interface OriginateOptions {
  endpoint: string;
  extension?: string;
  context?: string;
  priority?: number;
  label?: string;
  app?: string;
  appArgs?: string;
  callerId?: string;
  timeout?: number;
  variables?: Record<string, string>;
}
