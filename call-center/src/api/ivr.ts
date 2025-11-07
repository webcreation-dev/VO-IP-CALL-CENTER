import apiClient, { type ApiResponse } from './config';

// ============================================================================
// IVR Menu Interfaces
// ============================================================================

export interface IvrMenu {
  id: number;
  tenantId: number;
  name: string;
  description?: string;
  welcomeMessage?: string;
  invalidMessage?: string;
  timeoutMessage?: string;
  timeout: number;
  maxRetries: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIvrMenuDto {
  tenantId?: number;
  name: string;
  description?: string;
  welcomeMessage?: string;
  invalidMessage?: string;
  timeoutMessage?: string;
  timeout?: number;
  maxRetries?: number;
  isActive?: boolean;
}

export interface UpdateIvrMenuDto {
  name?: string;
  description?: string;
  welcomeMessage?: string;
  invalidMessage?: string;
  timeoutMessage?: string;
  timeout?: number;
  maxRetries?: number;
  isActive?: boolean;
}

// ============================================================================
// IVR Option Interfaces
// ============================================================================

export enum IvrOptionActionType {
  GOTO_MENU = 'goto_menu',
  GOTO_QUEUE = 'goto_queue',
  GOTO_EXTENSION = 'goto_extension',
  HANGUP = 'hangup',
  VOICEMAIL = 'voicemail',
  CALLBACK = 'callback',
  CUSTOM = 'custom',
}

export interface IvrOption {
  id: number;
  menuId: number;
  digit: string;
  description?: string;
  actionType: IvrOptionActionType;
  actionValue?: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIvrOptionDto {
  menuId: number;
  digit: string;
  description?: string;
  actionType: IvrOptionActionType;
  actionValue?: string;
  priority?: number;
}

export interface UpdateIvrOptionDto {
  digit?: string;
  description?: string;
  actionType?: IvrOptionActionType;
  actionValue?: string;
  priority?: number;
}

// ============================================================================
// IVR Condition Interfaces
// ============================================================================

export enum IvrConditionType {
  TIME_OF_DAY = 'time_of_day',
  DAY_OF_WEEK = 'day_of_week',
  CALLER_ID = 'caller_id',
  CUSTOM = 'custom',
}

export interface IvrCondition {
  id: number;
  menuId: number;
  conditionType: IvrConditionType;
  conditionValue: string;
  targetMenuId?: number;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIvrConditionDto {
  menuId: number;
  conditionType: IvrConditionType;
  conditionValue: string;
  targetMenuId?: number;
  priority?: number;
}

export interface UpdateIvrConditionDto {
  conditionType?: IvrConditionType;
  conditionValue?: string;
  targetMenuId?: number;
  priority?: number;
}

// ============================================================================
// IVR DID Mapping Interfaces
// ============================================================================

export interface IvrDidMapping {
  id: number;
  tenantId: number;
  did: string;
  menuId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  menu?: IvrMenu;
}

export interface CreateIvrDidMappingDto {
  tenantId?: number;
  did: string;
  menuId: number;
  isActive?: boolean;
}

export interface UpdateIvrDidMappingDto {
  did?: string;
  menuId?: number;
  isActive?: boolean;
}

// ============================================================================
// IVR Audio File Interfaces
// ============================================================================

export interface IvrAudioFile {
  id: number;
  tenantId: number;
  name: string;
  filename: string;
  filePath: string;
  description?: string;
  duration?: number;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadIvrAudioDto {
  tenantId?: number;
  name: string;
  description?: string;
  file: File;
}

// ============================================================================
// Enriched IVR Menu (with options, conditions, mappings)
// ============================================================================

export interface IvrMenuEnriched extends IvrMenu {
  options?: IvrOption[];
  conditions?: IvrCondition[];
  didMappings?: IvrDidMapping[];
  optionsCount?: number;
  conditionsCount?: number;
  didsCount?: number;
}

// ============================================================================
// Constants
// ============================================================================

export const IVR_ACTION_TYPES = [
  { value: IvrOptionActionType.GOTO_MENU, label: 'Aller vers un autre menu', icon: 'Menu' },
  { value: IvrOptionActionType.GOTO_QUEUE, label: 'Transférer vers une file d\'attente', icon: 'Users' },
  { value: IvrOptionActionType.GOTO_EXTENSION, label: 'Transférer vers une extension', icon: 'Phone' },
  { value: IvrOptionActionType.HANGUP, label: 'Raccrocher', icon: 'PhoneOff' },
  { value: IvrOptionActionType.VOICEMAIL, label: 'Messagerie vocale', icon: 'Voicemail' },
  { value: IvrOptionActionType.CALLBACK, label: 'Demander un rappel', icon: 'PhoneCall' },
  { value: IvrOptionActionType.CUSTOM, label: 'Action personnalisée', icon: 'Settings' },
];

export const IVR_CONDITION_TYPES = [
  { value: IvrConditionType.TIME_OF_DAY, label: 'Heure de la journée', example: '09:00-17:00' },
  { value: IvrConditionType.DAY_OF_WEEK, label: 'Jour de la semaine', example: 'Monday,Tuesday,Wednesday' },
  { value: IvrConditionType.CALLER_ID, label: 'Numéro appelant', example: '+33123456789' },
  { value: IvrConditionType.CUSTOM, label: 'Condition personnalisée', example: '${VARIABLE}==value' },
];

export const IVR_DIGITS = [
  { value: '0', label: 'Touche 0' },
  { value: '1', label: 'Touche 1' },
  { value: '2', label: 'Touche 2' },
  { value: '3', label: 'Touche 3' },
  { value: '4', label: 'Touche 4' },
  { value: '5', label: 'Touche 5' },
  { value: '6', label: 'Touche 6' },
  { value: '7', label: 'Touche 7' },
  { value: '8', label: 'Touche 8' },
  { value: '9', label: 'Touche 9' },
  { value: '*', label: 'Touche *' },
  { value: '#', label: 'Touche #' },
  { value: 'i', label: 'i - Choix invalide' },
  { value: 't', label: 't - Timeout' },
];

// ============================================================================
// IVR Service
// ============================================================================

class IvrService {
  // ========================================
  // IVR Menus
  // ========================================

  async getAllMenus(): Promise<IvrMenu[]> {
    const response = await apiClient.get<ApiResponse<IvrMenu[]>>('/ivr/menus');

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch IVR menus');
  }

  async getMenuById(id: number): Promise<IvrMenu> {
    const response = await apiClient.get<ApiResponse<IvrMenu>>(`/ivr/menus/${id}`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to fetch IVR menu ${id}`);
  }

  async getMenusEnriched(): Promise<IvrMenuEnriched[]> {
    const response = await apiClient.get<ApiResponse<IvrMenuEnriched[]>>('/ivr/menus/enriched');

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch enriched IVR menus');
  }

  async createMenu(data: CreateIvrMenuDto): Promise<IvrMenu> {
    const response = await apiClient.post<ApiResponse<IvrMenu>>('/ivr/menus', data);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to create IVR menu');
  }

  async updateMenu(id: number, data: UpdateIvrMenuDto): Promise<IvrMenu> {
    const response = await apiClient.put<ApiResponse<IvrMenu>>(`/ivr/menus/${id}`, data);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to update IVR menu ${id}`);
  }

  async deleteMenu(id: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/ivr/menus/${id}`);

    if (!response.data.success) {
      throw new Error(`Failed to delete IVR menu ${id}`);
    }
  }

  async duplicateMenu(id: number, tenantId?: number): Promise<IvrMenu> {
    const response = await apiClient.post<ApiResponse<IvrMenu>>(`/ivr/menus/${id}/duplicate`, {
      tenantId,
    });

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to duplicate IVR menu ${id}`);
  }

  // ========================================
  // IVR Options
  // ========================================

  async getOptionsByMenuId(menuId: number): Promise<IvrOption[]> {
    const response = await apiClient.get<ApiResponse<IvrOption[]>>(`/ivr/menus/${menuId}/options`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to fetch options for menu ${menuId}`);
  }

  async createOption(data: CreateIvrOptionDto): Promise<IvrOption> {
    const response = await apiClient.post<ApiResponse<IvrOption>>('/ivr/options', data);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to create IVR option');
  }

  async updateOption(id: number, data: UpdateIvrOptionDto): Promise<IvrOption> {
    const response = await apiClient.put<ApiResponse<IvrOption>>(`/ivr/options/${id}`, data);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to update IVR option ${id}`);
  }

  async deleteOption(id: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/ivr/options/${id}`);

    if (!response.data.success) {
      throw new Error(`Failed to delete IVR option ${id}`);
    }
  }

  // ========================================
  // IVR Conditions
  // ========================================

  async getConditionsByMenuId(menuId: number): Promise<IvrCondition[]> {
    const response = await apiClient.get<ApiResponse<IvrCondition[]>>(`/ivr/menus/${menuId}/conditions`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to fetch conditions for menu ${menuId}`);
  }

  async createCondition(data: CreateIvrConditionDto): Promise<IvrCondition> {
    const response = await apiClient.post<ApiResponse<IvrCondition>>('/ivr/conditions', data);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to create IVR condition');
  }

  async updateCondition(id: number, data: UpdateIvrConditionDto): Promise<IvrCondition> {
    const response = await apiClient.put<ApiResponse<IvrCondition>>(`/ivr/conditions/${id}`, data);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to update IVR condition ${id}`);
  }

  async deleteCondition(id: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/ivr/conditions/${id}`);

    if (!response.data.success) {
      throw new Error(`Failed to delete IVR condition ${id}`);
    }
  }

  // ========================================
  // IVR DID Mappings
  // ========================================

  async getAllDidMappings(): Promise<IvrDidMapping[]> {
    const response = await apiClient.get<ApiResponse<IvrDidMapping[]>>('/ivr/did-mappings');

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch DID mappings');
  }

  async createDidMapping(data: CreateIvrDidMappingDto): Promise<IvrDidMapping> {
    const response = await apiClient.post<ApiResponse<IvrDidMapping>>('/ivr/did-mappings', data);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to create DID mapping');
  }

  async updateDidMapping(id: number, data: UpdateIvrDidMappingDto): Promise<IvrDidMapping> {
    const response = await apiClient.put<ApiResponse<IvrDidMapping>>(`/ivr/did-mappings/${id}`, data);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to update DID mapping ${id}`);
  }

  async deleteDidMapping(id: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/ivr/did-mappings/${id}`);

    if (!response.data.success) {
      throw new Error(`Failed to delete DID mapping ${id}`);
    }
  }

  // ========================================
  // IVR Audio Files
  // ========================================

  async getAllAudioFiles(): Promise<IvrAudioFile[]> {
    const response = await apiClient.get<ApiResponse<IvrAudioFile[]>>('/ivr/audio');

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch audio files');
  }

  async uploadAudioFile(data: UploadIvrAudioDto): Promise<IvrAudioFile> {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('name', data.name);
    if (data.description) formData.append('description', data.description);
    if (data.tenantId) formData.append('tenantId', data.tenantId.toString());

    const response = await apiClient.post<ApiResponse<IvrAudioFile>>('/ivr/audio', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to upload audio file');
  }

  async deleteAudioFile(id: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/ivr/audio/${id}`);

    if (!response.data.success) {
      throw new Error(`Failed to delete audio file ${id}`);
    }
  }

  // ========================================
  // Helper Methods
  // ========================================

  getActionTypeLabel(actionType: IvrOptionActionType): string {
    const found = IVR_ACTION_TYPES.find((a) => a.value === actionType);
    return found ? found.label : actionType;
  }

  getActionTypeIcon(actionType: IvrOptionActionType): string {
    const found = IVR_ACTION_TYPES.find((a) => a.value === actionType);
    return found ? found.icon : 'Settings';
  }

  getConditionTypeLabel(conditionType: IvrConditionType): string {
    const found = IVR_CONDITION_TYPES.find((c) => c.value === conditionType);
    return found ? found.label : conditionType;
  }

  getConditionTypeExample(conditionType: IvrConditionType): string {
    const found = IVR_CONDITION_TYPES.find((c) => c.value === conditionType);
    return found ? found.example : '';
  }

  formatDuration(seconds?: number): string {
    if (!seconds) return '-';

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }

    return `${secs}s`;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  validateDigit(digit: string): boolean {
    return /^[0-9*#it]$/.test(digit);
  }

  getDigitLabel(digit: string): string {
    const found = IVR_DIGITS.find((d) => d.value === digit);
    return found ? found.label : digit;
  }
}

export default new IvrService();
