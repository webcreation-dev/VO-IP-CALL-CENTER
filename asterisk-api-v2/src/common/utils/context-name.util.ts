/**
 * Context Name Utility
 *
 * Generates Asterisk-compatible context names from tenant names
 */

/**
 * Generate context name from tenant name
 *
 * Rules:
 * - Convert to lowercase
 * - Remove accents/diacritics
 * - Replace non-alphanumeric characters with underscores
 * - Remove consecutive underscores
 * - Remove leading/trailing underscores
 * - Max 40 characters (Asterisk limitation)
 *
 * @param tenantName - Tenant name
 * @returns Context name
 *
 * @example
 * generateContextName('Company A') // 'company_a'
 * generateContextName('Société XYZ') // 'societe_xyz'
 * generateContextName('Client-123') // 'client_123'
 */
export function generateContextName(tenantName: string): string {
  return (
    tenantName
      .toLowerCase()
      // Normalize and remove diacritics (accents)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Replace non-alphanumeric characters with underscore
      .replace(/[^a-z0-9]/g, '_')
      // Replace multiple underscores with single underscore
      .replace(/_+/g, '_')
      // Remove leading/trailing underscores
      .replace(/^_|_$/g, '')
      // Limit to 40 characters
      .substring(0, 40)
  );
}

/**
 * Validate context name format
 *
 * Checks if a context name is valid for Asterisk
 *
 * @param contextName - Context name to validate
 * @returns true if valid
 */
export function isValidContextName(contextName: string): boolean {
  // Must be 1-40 characters
  if (!contextName || contextName.length > 40) {
    return false;
  }

  // Must match pattern: lowercase letters, digits, underscores, hyphens
  return /^[a-z0-9_-]+$/.test(contextName);
}

/**
 * Generate unique context name with suffix if needed
 *
 * Used when generated context already exists
 *
 * @param baseName - Base context name
 * @param existingContexts - Array of existing context names
 * @returns Unique context name
 *
 * @example
 * generateUniqueContextName('company', ['company']) // 'company_2'
 * generateUniqueContextName('company', ['company', 'company_2']) // 'company_3'
 */
export function generateUniqueContextName(
  baseName: string,
  existingContexts: string[],
): string {
  let contextName = baseName;
  let counter = 2;

  while (existingContexts.includes(contextName)) {
    // Ensure name + suffix doesn't exceed 40 chars
    const suffix = `_${counter}`;
    const maxBaseLength = 40 - suffix.length;
    contextName = baseName.substring(0, maxBaseLength) + suffix;
    counter++;
  }

  return contextName;
}
