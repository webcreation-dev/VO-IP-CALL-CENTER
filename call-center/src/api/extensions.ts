import apiClient, { type ApiResponse } from './config';

// Extension Interface (from DB)
export interface Extension {
  id: number;
  tenantId: number;
  context: string;
  exten: string;
  priority: number;
  app: string;
  appdata: string;
  createdAt: string;
  updatedAt: string;
}

// Create Extension DTO
export interface CreateExtensionDto {
  tenantId?: number;        // For SUPER_ADMIN
  context: string;          // Required, max 40 chars
  exten: string;            // Required, pattern like _1XXX, 999, etc.
  priority?: number;        // Optional, auto-calculated if not provided
  app: string;              // Required, Asterisk application
  appdata: string;          // Required, application arguments
}

// Update Extension DTO
export interface UpdateExtensionDto {
  context?: string;
  exten?: string;
  priority?: number;
  app?: string;
  appdata?: string;
}

// Extension Filter DTO
export interface ExtensionFilterDto {
  context?: string;
  exten?: string;
  app?: string;
  minPriority?: number;
  maxPriority?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

// Asterisk Applications
export const ASTERISK_APPS = [
  { value: 'Dial', label: 'Dial - Appeler un endpoint/numéro', example: 'PJSIP/${EXTEN},30,t' },
  { value: 'Queue', label: 'Queue - File d\'attente', example: 't1_support,t,,,300' },
  { value: 'Playback', label: 'Playback - Jouer un fichier audio', example: 'welcome' },
  { value: 'Background', label: 'Background - Audio avec DTMF', example: 'main-menu' },
  { value: 'Hangup', label: 'Hangup - Raccrocher', example: '' },
  { value: 'Goto', label: 'Goto - Sauter à une extension', example: 'default,s,1' },
  { value: 'GotoIf', label: 'GotoIf - Saut conditionnel', example: '$["${CALLERID(num)}" = ""]?hangup,1' },
  { value: 'VoiceMail', label: 'VoiceMail - Messagerie vocale', example: '100@default' },
  { value: 'Set', label: 'Set - Définir une variable', example: 'TIMEOUT(digit)=5' },
  { value: 'NoOp', label: 'NoOp - Commentaire', example: 'Starting call processing' },
  { value: 'Wait', label: 'Wait - Attendre', example: '2' },
  { value: 'Answer', label: 'Answer - Répondre', example: '' },
  { value: 'AGI', label: 'AGI - Script AGI', example: 'agi://localhost/script.agi' },
  { value: 'EAGI', label: 'EAGI - Enhanced AGI', example: 'script.agi' },
  { value: 'Read', label: 'Read - Lire DTMF', example: 'digits,beep,4' },
  { value: 'SayDigits', label: 'SayDigits - Dire chiffres', example: '${EXTEN}' },
  { value: 'SayNumber', label: 'SayNumber - Dire nombre', example: '${CALLERID(num)}' },
  { value: 'Echo', label: 'Echo - Test écho', example: '' },
  { value: 'Verbose', label: 'Verbose - Log', example: 'Call from ${CALLERID(num)}' },
  { value: 'MixMonitor', label: 'MixMonitor - Enregistrer', example: '${UNIQUEID}.wav' },
];

// Common Extension Patterns
export const EXTENSION_PATTERNS = [
  { value: '_1XXX', label: '_1XXX - Extensions 1000-1999' },
  { value: '_2XXX', label: '_2XXX - Extensions 2000-2999' },
  { value: '_[2-9]XX', label: '_[2-9]XX - Extensions 200-999' },
  { value: '_[2-9]XXXXXXX', label: '_[2-9]XXXXXXX - Numéros 7 chiffres' },
  { value: '_0[1-9]XXXXXXXXX', label: '_0[1-9]XXXXXXXXX - Numéros français (10 chiffres)' },
  { value: '_9NXXNXXXXXX', label: '_9NXXNXXXXXX - Numéros US/Canada' },
  { value: 's', label: 's - Start (extension par défaut)' },
  { value: 'i', label: 'i - Invalid (choix invalide)' },
  { value: 't', label: 't - Timeout' },
  { value: 'h', label: 'h - Hangup (raccrochage)' },
];

class ExtensionsService {
  // Get all extensions
  async getAll(filters?: ExtensionFilterDto): Promise<Extension[]> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.context) params.append('context', filters.context);
      if (filters.exten) params.append('exten', filters.exten);
      if (filters.app) params.append('app', filters.app);
      if (filters.minPriority !== undefined) params.append('minPriority', String(filters.minPriority));
      if (filters.maxPriority !== undefined) params.append('maxPriority', String(filters.maxPriority));
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', String(filters.page)); // Backend expects 1-indexed
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    }

    const queryString = params.toString();
    const url = `/extensions${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get<ApiResponse<{
      data: Extension[];
      total: number;
      page: number;
      limit: number;
    }>>(url);

    if (response.data.success && response.data.data) {
      return response.data.data.data;  // Extract extensions array from paginated response
    }

    throw new Error('Failed to fetch extensions');
  }

  // Get extensions by context
  async getByContext(context: string): Promise<Extension[]> {
    const response = await apiClient.get<ApiResponse<Extension[]>>(`/extensions/context/${context}`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to fetch extensions for context ${context}`);
  }

  // Get extension by ID
  async getById(id: number): Promise<Extension> {
    const response = await apiClient.get<ApiResponse<Extension>>(`/extensions/${id}`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to fetch extension ${id}`);
  }

  // Get unique contexts
  async getContexts(): Promise<string[]> {
    const response = await apiClient.get<ApiResponse<string[]>>('/extensions/contexts');

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch contexts');
  }

  // Create extension
  async create(data: CreateExtensionDto): Promise<Extension> {
    const response = await apiClient.post<ApiResponse<Extension>>('/extensions', data);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to create extension');
  }

  // Update extension
  async update(id: number, data: UpdateExtensionDto): Promise<Extension> {
    const response = await apiClient.put<ApiResponse<Extension>>(`/extensions/${id}`, data);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to update extension ${id}`);
  }

  // Delete extension
  async delete(id: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/extensions/${id}`);

    if (!response.data.success) {
      throw new Error(`Failed to delete extension ${id}`);
    }
  }

  // Helper: Get app label
  getAppLabel(app: string): string {
    const found = ASTERISK_APPS.find(a => a.value === app);
    return found ? found.label : app;
  }

  // Helper: Get app example
  getAppExample(app: string): string {
    const found = ASTERISK_APPS.find(a => a.value === app);
    return found ? found.example : '';
  }

  // Helper: Validate extension pattern
  validatePattern(pattern: string): boolean {
    // Basic Asterisk pattern validation
    // Patterns can start with _ or be literal
    // Valid characters: digits, X, N, Z, ., !, [, ], -, s, i, t, h
    const asteriskPattern = /^(_?[0-9XNZ.\[\]\-sith!]+)$/;
    return asteriskPattern.test(pattern);
  }

  // Helper: Format priority display
  formatPriority(priority: number): string {
    return priority.toString().padStart(3, '0');
  }

  // Helper: Get app color for UI
  getAppColor(app: string): string {
    switch (app) {
      case 'Dial': return 'blue';
      case 'Queue': return 'green';
      case 'Hangup': return 'red';
      case 'Goto':
      case 'GotoIf': return 'purple';
      case 'Playback':
      case 'Background': return 'cyan';
      case 'VoiceMail': return 'orange';
      case 'Set':
      case 'NoOp': return 'gray';
      default: return 'gray';
    }
  }

  // Helper: Group extensions by context
  groupByContext(extensions: Extension[]): Record<string, Extension[]> {
    return extensions.reduce((acc, ext) => {
      if (!acc[ext.context]) {
        acc[ext.context] = [];
      }
      acc[ext.context].push(ext);
      return acc;
    }, {} as Record<string, Extension[]>);
  }

  // Helper: Generate dialplan preview
  generateDialplanPreview(extension: Extension): string {
    return `exten => ${extension.exten},${extension.priority},${extension.app}(${extension.appdata})`;
  }
}

export default new ExtensionsService();
