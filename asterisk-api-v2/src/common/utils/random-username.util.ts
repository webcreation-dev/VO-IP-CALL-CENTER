import { randomBytes } from 'crypto';

/**
 * Generates a random username for SIP authentication
 *
 * @returns A random alphanumeric string less than 40 characters
 *
 * Requirements:
 * - Must be unique (caller should validate against database)
 * - Must be less than 40 characters
 * - Must NOT be prefixed by tenant ID (used directly in ps_auths)
 * - Used for SIP authentication (identify_by: 'username')
 *
 * @example
 * generateRandomUsername() // => "a7k9m2p8n4x6v1b3c5d7e9f2g4h6j1k3"
 */
export function generateRandomUsername(): string {
  // Generate 16 random bytes and convert to hex (32 characters)
  // This ensures uniqueness and stays well under the 40 character limit
  const randomHex = randomBytes(16).toString('hex');

  return randomHex;
}

/**
 * Validates if a username meets the requirements
 *
 * @param username - The username to validate
 * @returns true if valid, false otherwise
 */
export function isValidRandomUsername(username: string): boolean {
  if (!username || typeof username !== 'string') {
    return false;
  }

  // Must be less than 40 characters
  if (username.length >= 40) {
    return false;
  }

  // Should only contain alphanumeric characters (for SIP compatibility)
  const alphanumericRegex = /^[a-zA-Z0-9]+$/;
  return alphanumericRegex.test(username);
}
