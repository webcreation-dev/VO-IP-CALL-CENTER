/**
 * AMI Action names
 */
export const AMI_ACTIONS = {
  // Queue actions
  QUEUE_STATUS: 'QueueStatus',
  QUEUE_ADD: 'QueueAdd',
  QUEUE_REMOVE: 'QueueRemove',
  QUEUE_PAUSE: 'QueuePause',
  QUEUE_PENALTY: 'QueuePenalty',
  QUEUE_RELOAD: 'QueueReload',
  QUEUE_RESET: 'QueueReset',
  QUEUE_RULE: 'QueueRule',
  QUEUE_SUMMARY: 'QueueSummary',

  // PJSIP actions
  PJSIP_SHOW_ENDPOINT: 'PJSIPShowEndpoint',
  PJSIP_SHOW_ENDPOINTS: 'PJSIPShowEndpoints',
  PJSIP_SHOW_AOR: 'PJSIPShowAor',
  PJSIP_SHOW_CONTACTS: 'PJSIPShowContacts',
  PJSIP_RELOAD: 'PJSIPReload',

  // Module actions
  MODULE_RELOAD: 'ModuleReload',
  MODULE_LOAD: 'ModuleLoad',
  MODULE_UNLOAD: 'ModuleUnload',

  // Channel actions
  HANGUP: 'Hangup',
  ORIGINATE: 'Originate',
  REDIRECT: 'Redirect',

  // System actions
  COMMAND: 'Command',
  RELOAD: 'Reload',
  PING: 'Ping',
  CORE_SHOW_CHANNELS: 'CoreShowChannels',
} as const;

/**
 * AMI Event names
 */
export const AMI_EVENTS = {
  // Queue events
  QUEUE_PARAMS: 'QueueParams',
  QUEUE_MEMBER: 'QueueMember',
  QUEUE_ENTRY: 'QueueEntry',
  QUEUE_STATUS_COMPLETE: 'QueueStatusComplete',
  QUEUE_MEMBER_ADDED: 'QueueMemberAdded',
  QUEUE_MEMBER_REMOVED: 'QueueMemberRemoved',
  QUEUE_MEMBER_PAUSE: 'QueueMemberPause',
  QUEUE_MEMBER_PENALTY: 'QueueMemberPenalty',
  QUEUE_MEMBER_RINGINUSE: 'QueueMemberRinginuse',
  QUEUE_MEMBER_STATUS: 'QueueMemberStatus',
  QUEUE_CALLER_JOIN: 'QueueCallerJoin',
  QUEUE_CALLER_LEAVE: 'QueueCallerLeave',
  QUEUE_CALLER_ABANDON: 'QueueCallerAbandon',

  // PJSIP events
  ENDPOINT_DETAIL: 'EndpointDetail',
  ENDPOINT_LIST: 'EndpointList',
  ENDPOINT_LIST_COMPLETE: 'EndpointListComplete',
  AOR_DETAIL: 'AorDetail',
  AOR_LIST: 'AorList',
  AOR_LIST_COMPLETE: 'AorListComplete',
  CONTACT_STATUS: 'ContactStatus',
  CONTACT_STATUS_DETAIL: 'ContactStatusDetail',

  // Device state events
  DEVICE_STATE_CHANGE: 'DeviceStateChange',
  EXTENSION_STATUS: 'ExtensionStatus',

  // Channel events
  NEWCHANNEL: 'Newchannel',
  HANGUP: 'Hangup',
  NEW_STATE: 'Newstate',
  DIAL_BEGIN: 'DialBegin',
  DIAL_END: 'DialEnd',

  // System events
  FULLY_BOOTED: 'FullyBooted',
  SHUTDOWN: 'Shutdown',
} as const;

/**
 * Default timeouts (milliseconds)
 */
export const AMI_TIMEOUTS = {
  DEFAULT: 5000,
  LONG: 10000,
  SHORT: 2000,
  QUEUE_STATUS: 5000,
  ENDPOINT_STATUS: 5000,
} as const;

/**
 * Queue member status codes
 */
export const QUEUE_MEMBER_STATUS = {
  UNKNOWN: -1,
  NOT_IN_USE: 0,
  IN_USE: 1,
  BUSY: 2,
  INVALID: 3,
  UNAVAILABLE: 4,
  RINGING: 5,
  RING_AND_IN_USE: 6,
  ON_HOLD: 7,
} as const;

/**
 * Paused status
 */
export const PAUSED_STATUS = {
  NOT_PAUSED: 0,
  PAUSED: 1,
} as const;
