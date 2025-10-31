/**
 * Localized text supporting multiple languages
 */
export interface LocalizedText {
  en: string;
  fr: string;
}

/**
 * UI metadata for displaying enum values
 */
export interface UIMetadata {
  /** Suggested color (hex format) */
  color?: string;

  /** Suggested icon name (e.g., Font Awesome, Heroicons) */
  icon?: string;

  /** Badge style (Bootstrap-like: success, warning, danger, info, secondary) */
  badge?: 'success' | 'warning' | 'danger' | 'info' | 'secondary';

  /** Display order (lower numbers first) */
  order?: number;

  /** Indicates if value is deprecated */
  deprecated?: boolean;
}

/**
 * Individual enum value with translations and metadata
 */
export interface EnumValue {
  /** Unique key/identifier for the value */
  key: string;

  /** Localized human-readable label */
  label: LocalizedText;

  /** Localized description/tooltip */
  description: LocalizedText;

  /** Optional UI metadata for frontend display */
  metadata?: UIMetadata;

  /** Numeric value (for AMI codes, etc.) */
  numericValue?: number;
}

/**
 * Complete enum category with all its values
 */
export interface EnumCategory {
  /** Category identifier (kebab-case) */
  category: string;

  /** Localized category name */
  label: LocalizedText;

  /** Localized category description */
  description: LocalizedText;

  /** Source module (for organization) */
  module: string;

  /** All enum values in this category */
  values: EnumValue[];
}

/**
 * Summary of available enum categories
 */
export interface EnumCategorySummary {
  category: string;
  label: LocalizedText;
  module: string;
  valuesCount: number;
}
