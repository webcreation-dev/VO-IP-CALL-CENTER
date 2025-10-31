/**
 * AMI Configuration interface
 */
export interface AmiConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  events: boolean;
}

/**
 * Generic AMI Action interface
 */
export interface AmiAction {
  Action: string;
  ActionID?: string;
  [key: string]: any;
}

/**
 * AMI Response interface
 */
export interface AmiResponse {
  response: string;
  actionid?: string;
  message?: string;
  [key: string]: any;
}

/**
 * Queue Status Result
 */
export interface QueueStatusResult {
  queue: string;
  max: number;
  strategy: string;
  calls: number;
  holdtime: number;
  talktime: number;
  completed: number;
  abandoned: number;
  servicelevel: number;
  servicelevelperf: number;
  weight: number;
  members: QueueMember[];
}

/**
 * Queue Member interface
 */
export interface QueueMember {
  name: string;
  location: string;
  stateInterface: string;
  membership: string;
  penalty: number;
  callsTaken: number;
  lastCall: number;
  lastPause: number;
  status: number;
  paused: number;
  pausedReason?: string;
  wrapuptime: number;
  inCall: number;
}

/**
 * Contact Status Detail
 */
export interface ContactStatusDetail {
  uri: string;
  status: string;
  rtt?: string;
  userAgent?: string;
}

/**
 * Endpoint Status Result
 */
export interface EndpointStatusResult {
  objectType: string;
  objectName: string;
  transport: string;
  aor: string;
  auths: string;
  outboundAuths: string;
  contacts: ContactStatusDetail[] | null;
  deviceState: string;
  activeChannels: number;
}

/**
 * Device State values
 */
export enum DeviceState {
  UNKNOWN = 'Unknown',
  NOT_INUSE = 'Not in use',
  INUSE = 'In use',
  BUSY = 'Busy',
  INVALID = 'Invalid',
  UNAVAILABLE = 'Unavailable',
  RINGING = 'Ringing',
  RINGINUSE = 'Ring+Inuse',
  ONHOLD = 'On Hold',
}
