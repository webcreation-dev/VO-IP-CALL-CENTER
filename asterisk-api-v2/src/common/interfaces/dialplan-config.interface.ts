/**
 * Dialplan Configuration Interface
 *
 * Defines the numbering plan and dialing patterns for a tenant
 * These settings control how extensions are auto-generated and validated
 */
export interface DialplanConfig {
  /**
   * Pattern for internal extension dialing
   * Examples: "_1XXX" (1000-1999), "_2XXX" (2000-2999), "_[1-5]XXX" (1000-5999)
   */
  internalDialPattern: string;

  /**
   * Timeout in seconds for internal calls
   * Default: 20 seconds
   */
  internalDialTimeout: number;

  /**
   * Pattern for queue access numbers
   * Examples: "_5XXX" (5000-5999), "_9XXX" (9000-9999)
   */
  queuePattern?: string;

  /**
   * Pattern for voicemail access
   * Examples: "*XXX" (voicemail for extension XXX), "_*1XXX"
   */
  voicemailPattern?: string;

  /**
   * Test/echo extension number
   * Examples: "999", "600", "*43"
   */
  testExtension?: string;

  /**
   * Allow external calls (outside the tenant context)
   * If true, externalPattern must be defined
   */
  allowExternal: boolean;

  /**
   * Pattern for external calls (if allowed)
   * Examples: "_0XXXXXXXXX" (10-digit numbers starting with 0)
   */
  externalPattern?: string;

  /**
   * Prefix for outgoing external calls
   * Example: "9" (dial 9 then external number)
   */
  externalPrefix?: string;
}

/**
 * Default dialplan configuration
 * Used when tenant doesn't provide custom config
 */
export const DEFAULT_DIALPLAN_CONFIG: DialplanConfig = {
  internalDialPattern: '_1XXX',
  internalDialTimeout: 20,
  queuePattern: '_5XXX',
  voicemailPattern: '*XXX',
  testExtension: '999',
  allowExternal: false,
};
