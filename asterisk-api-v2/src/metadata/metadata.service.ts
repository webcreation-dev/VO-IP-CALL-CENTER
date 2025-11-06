import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ENUM_CATEGORIES } from './metadata.constants';
import {
  EnumCategory,
  EnumCategorySummary,
  EnumValue,
  LocalizedText,
} from './interfaces/metadata.interface';
import { AmiService } from '../core/asterisk/ami/ami.service';

type Language = 'en' | 'fr';

@Injectable()
export class MetadataService {
  private readonly logger = new Logger(MetadataService.name);

  constructor(private readonly amiService: AmiService) {}

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

  /**
   * Get available PJSIP transports from Asterisk
   * Retrieves actual configured transports instead of static protocol list
   *
   * @param lang - Language for labels
   * @returns List of available transports formatted as EnumValue[]
   */
  async getAvailableTransports(lang: Language = 'en'): Promise<EnumValue[]> {
    try {
      const transports = await this.amiService.getPJSIPTransports();

      return transports.map((transport, index) => ({
        key: transport.id,
        label: {
          en: transport.id,
          fr: transport.id,
        },
        description: {
          en: `${transport.protocol.toUpperCase()} transport on ${transport.bind}`,
          fr: `Transport ${transport.protocol.toUpperCase()} sur ${transport.bind}`,
        },
        metadata: {
          protocol: transport.protocol,
          bind: transport.bind,
          externalMediaAddress: transport.externalMediaAddress,
          externalSignalingAddress: transport.externalSignalingAddress,
          order: this.getTransportOrder(transport.protocol),
        },
        numericValue: index,
      }));
    } catch (error) {
      this.logger.warn(`Failed to get transports from AMI: ${error.message}`);
      this.logger.log('Falling back to static transport protocols list');

      // Fallback to static list if AMI fails
      return this.getEnumByCategory('transport-protocols', lang).values;
    }
  }

  /**
   * Get transport protocol order for sorting
   * Prioritizes common protocols
   */
  private getTransportOrder(protocol: string): number {
    const order: Record<string, number> = {
      udp: 1,
      tcp: 2,
      tls: 3,
      ws: 4,
      wss: 5,
    };
    return order[protocol.toLowerCase()] || 99;
  }
}
