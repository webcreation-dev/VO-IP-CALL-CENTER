// interfaces/ivr-session.interface.ts
import { IvrMenu } from '../entities/ivr-menu.entity';

export interface IvrSession {
  /**
   * ID du channel Asterisk
   */
  channelId: string;

  /**
   * ID du tenant
   */
  tenantId: number;

  /**
   * Menu IVR actuellement actif
   */
  currentMenu: IvrMenu;

  /**
   * Pile des menus (historique de navigation)
   */
  menuStack: number[];

  /**
   * Compteur de tentatives (timeout/invalid)
   */
  retryCount: number;

  /**
   * Données de l'appel
   */
  callData: {
    did: string;
    callerId: string;
  };

  /**
   * Timestamp du début du menu actuel
   */
  menuStartedAt?: Date;

  /**
   * Buffer DTMF (pour les menus multi-digits)
   */
  dtmfBuffer?: string;

  /**
   * Variables custom (pour stocker des données temporaires)
   */
  variables?: Record<string, any>;

  /**
   * Langue de la session
   */
  language?: string;
}

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
    app_name: string;
    app_data: string;
  };
  creationtime: string;
  language: string;
}

export interface AriDtmfEvent {
  type: 'ChannelDtmfReceived';
  timestamp: string;
  digit: string;
  duration_ms: number;
  channel: AriChannel;
  application: string;
}

export interface AriPlaybackEvent {
  type: 'PlaybackFinished' | 'PlaybackStarted';
  timestamp: string;
  playback: {
    id: string;
    media_uri: string;
    target_uri: string;
    language: string;
    state: string;
  };
  application: string;
}

export interface AriStasisStartEvent {
  type: 'StasisStart';
  timestamp: string;
  args: string[];
  channel: AriChannel;
  replace_channel?: AriChannel;
  application: string;
}

export interface AriStasisEndEvent {
  type: 'StasisEnd';
  timestamp: string;
  channel: AriChannel;
  application: string;
}