import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ENUM_CATEGORIES } from './metadata.constants';
import {
  EnumCategory,
  EnumCategorySummary,
  EnumValue,
  LocalizedText,
} from './interfaces/metadata.interface';

type Language = 'en' | 'fr';

@Injectable()
export class MetadataService {
  private readonly logger = new Logger(MetadataService.name);

  /**
   * Get all enum categories (summary)
   * Returns a list of all available enum categories with counts
   */
  getAllCategories(lang: Language = 'en'): EnumCategorySummary[] {
    return ENUM_CATEGORIES.map((category) => ({
      category: category.category,
      label: this.localizeText(category.label, lang),
      module: category.module,
      valuesCount: category.values.length,
    }));
  }

  /**
   * Get all enums with full details
   * Returns all enum categories with localized values
   */
  getAllEnums(lang: Language = 'en'): EnumCategory[] {
    return ENUM_CATEGORIES.map((category) => this.localizeCategory(category, lang));
  }

  /**
   * Get a specific enum category by name
   * Returns a single enum category with localized values
   */
  getEnumByCategory(category: string, lang: Language = 'en'): EnumCategory {
    const found = ENUM_CATEGORIES.find((c) => c.category === category);

    if (!found) {
      this.logger.warn(`Enum category not found: ${category}`);
      throw new NotFoundException(`Enum category '${category}' not found`);
    }

    return this.localizeCategory(found, lang);
  }

  /**
   * Get list of all available enum categories (identifiers only)
   */
  getAvailableCategories(): string[] {
    return ENUM_CATEGORIES.map((c) => c.category);
  }

  /**
   * Search enums by keyword across all categories
   */
  searchEnums(keyword: string, lang: Language = 'en'): EnumCategory[] {
    const lowerKeyword = keyword.toLowerCase();

    return ENUM_CATEGORIES.map((category) => {
      const matchingValues = category.values.filter((value) => {
        const keyMatch = value.key.toLowerCase().includes(lowerKeyword);
        const labelMatch = value.label[lang].toLowerCase().includes(lowerKeyword);
        const descMatch = value.description[lang].toLowerCase().includes(lowerKeyword);
        return keyMatch || labelMatch || descMatch;
      });

      if (matchingValues.length > 0) {
        return {
          ...this.localizeCategory(category, lang),
          values: matchingValues.map((v) => this.localizeValue(v, lang)),
        };
      }

      return null;
    }).filter((c) => c !== null) as EnumCategory[];
  }

  /**
   * Localize an entire category
   */
  private localizeCategory(category: EnumCategory, lang: Language): EnumCategory {
    return {
      category: category.category,
      label: this.localizeText(category.label, lang),
      description: this.localizeText(category.description, lang),
      module: category.module,
      values: category.values.map((v) => this.localizeValue(v, lang)),
    };
  }

  /**
   * Localize a single enum value
   */
  private localizeValue(value: EnumValue, lang: Language): EnumValue {
    return {
      key: value.key,
      label: this.localizeText(value.label, lang),
      description: this.localizeText(value.description, lang),
      metadata: value.metadata,
      numericValue: value.numericValue,
    };
  }

  /**
   * Extract localized text for specified language
   */
  private localizeText(text: LocalizedText, lang: Language): LocalizedText {
    // Return both languages for flexibility, but frontend can use the requested one
    return text;
  }
}
