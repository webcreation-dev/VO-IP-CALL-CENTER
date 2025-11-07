import apiClient, { type ApiResponse } from './config';

// Metadata interfaces
export interface EnumValue {
  key: string;
  label: {
    en: string;
    fr: string;
  };
  description?: {
    en: string;
    fr: string;
  };
  metadata?: {
    color?: string;
    icon?: string;
    badge?: string;
    order?: number;
  };
}

export interface EnumCategory {
  category: string;
  label: {
    en: string;
    fr: string;
  };
  description?: {
    en: string;
    fr: string;
  };
  module: string;
  values: EnumValue[];
}

export interface EnumCategorySummary {
  category: string;
  label: {
    en: string;
    fr: string;
  };
  module: string;
  valuesCount: number;
}

class MetadataService {
  // Get all enum categories (summary)
  async getAllCategories(lang: 'en' | 'fr' = 'fr'): Promise<EnumCategorySummary[]> {
    const response = await apiClient.get<ApiResponse<EnumCategorySummary[]>>('/metadata/enums', {
      params: { lang }
    });

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch enum categories');
  }

  // Get all enums with full details
  async getAllEnums(lang: 'en' | 'fr' = 'fr'): Promise<EnumCategory[]> {
    const response = await apiClient.get<ApiResponse<EnumCategory[]>>('/metadata/enums/all', {
      params: { lang }
    });

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch all enums');
  }

  // Get specific enum category
  async getEnumByCategory(category: string, lang: 'en' | 'fr' = 'fr'): Promise<EnumCategory> {
    const response = await apiClient.get<ApiResponse<EnumCategory>>(`/metadata/enums/${category}`, {
      params: { lang }
    });

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to fetch enum category: ${category}`);
  }

  // Get transport protocols (legacy - returns static list)
  async getTransportProtocols(lang: 'en' | 'fr' = 'fr'): Promise<EnumValue[]> {
    const category = await this.getEnumByCategory('transport-protocols', lang);
    return category.values;
  }

  // Get available PJSIP transports from Asterisk (dynamic)
  async getAvailableTransports(lang: 'en' | 'fr' = 'fr'): Promise<EnumValue[]> {
    const response = await apiClient.get<ApiResponse<EnumValue[]>>('/metadata/transports/available', {
      params: { lang }
    });

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch available transports');
  }

  // Get DTMF modes
  async getDtmfModes(lang: 'en' | 'fr' = 'fr'): Promise<EnumValue[]> {
    const category = await this.getEnumByCategory('dtmf-modes', lang);
    return category.values;
  }

  // Get device states
  async getDeviceStates(lang: 'en' | 'fr' = 'fr'): Promise<EnumValue[]> {
    const category = await this.getEnumByCategory('endpoint-device-states', lang);
    return category.values;
  }

  // Get available codecs (static list since not in metadata)
  getAvailableCodecs(): Array<{ key: string; label: string; description: string }> {
    return [
      { key: 'ulaw', label: 'G.711 µ-law', description: 'Standard codec, 64 kbps' },
      { key: 'alaw', label: 'G.711 A-law', description: 'European standard, 64 kbps' },
      { key: 'g722', label: 'G.722', description: 'Wideband codec, 64 kbps' },
      { key: 'opus', label: 'Opus', description: 'Modern codec, variable bitrate' },
      { key: 'gsm', label: 'GSM', description: 'Low bandwidth, 13 kbps' },
      { key: 'g729', label: 'G.729', description: 'Low bandwidth, 8 kbps' },
      { key: 'speex', label: 'Speex', description: 'Open source, variable bitrate' },
    ];
  }

  // Search enums by keyword
  async searchEnums(keyword: string, lang: 'en' | 'fr' = 'fr'): Promise<EnumCategory[]> {
    const response = await apiClient.get<ApiResponse<EnumCategory[]>>(`/metadata/enums/search/${keyword}`, {
      params: { lang }
    });

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to search enums');
  }

  // Get available category identifiers
  async getAvailableCategories(): Promise<string[]> {
    const response = await apiClient.get<ApiResponse<string[]>>('/metadata/categories');

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch available categories');
  }
}

export default new MetadataService();
