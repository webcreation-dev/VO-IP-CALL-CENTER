/**
 * Utility class for managing tenant prefixes on entity names
 * Format: t{tenantId}_{name}
 * Example: t1_support, t2_101
 */
export class TenantPrefixUtil {
  /**
   * Add tenant prefix to a name
   * @param tenantId - Tenant ID
   * @param name - Original name
   * @returns Prefixed name (e.g., "t1_support")
   */
  static addPrefix(tenantId: number, name: string): string {
    if (!name) {
      throw new Error('Name cannot be empty');
    }
    return `t${tenantId}_${name}`;
  }

  /**
   * Remove tenant prefix from a prefixed name
   * @param prefixedName - Prefixed name (e.g., "t1_support")
   * @returns Object with tenantId and original name
   */
  static removePrefix(prefixedName: string): { tenantId: number; name: string } {
    const match = prefixedName.match(/^t(\d+)_(.+)$/);

    if (!match) {
      throw new Error(`Invalid prefixed name format: ${prefixedName}. Expected format: t{tenantId}_{name}`);
    }

    return {
      tenantId: parseInt(match[1], 10),
      name: match[2],
    };
  }

  /**
   * Extract only the tenant ID from a prefixed name
   * @param prefixedName - Prefixed name (e.g., "t1_support")
   * @returns Tenant ID
   */
  static extractTenantId(prefixedName: string): number {
    const { tenantId } = this.removePrefix(prefixedName);
    return tenantId;
  }

  /**
   * Check if a name has a tenant prefix
   * @param name - Name to check
   * @returns True if has prefix
   */
  static hasPrefix(name: string): boolean {
    return /^t\d+_.+$/.test(name);
  }

  /**
   * Batch add prefixes to multiple names
   * @param tenantId - Tenant ID
   * @param names - Array of names
   * @returns Array of prefixed names
   */
  static addPrefixBatch(tenantId: number, names: string[]): string[] {
    return names.map(name => this.addPrefix(tenantId, name));
  }
}
