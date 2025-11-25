import apiClient, { type ApiResponse } from './config';
import type { EndpointRole } from '../types/roles';

// Endpoint interfaces
export interface Endpoint {
  id: string;
  displayName: string;
  tenantId: number;
  transport: string;
  context: string;
  allow: string;
  callerid: string;
  deviceState?: string;
  activeChannels?: number;
  // Enriched data from AMI
  contactStatus?: string;
  contactIP?: string;
  userAgent?: string;
  latency?: number;
  // Role management
  roleId?: number;
  role?: EndpointRole;
}

export interface EndpointCreateRequest {
  tenantId?: number;
  displayName?: string;
  password: string;
  context: string;
  transport?: string;
  callerid?: string;
  codecs?: string;
  directMedia?: string;
  dtmfMode?: string;
  maxContacts?: number;
  mailboxes?: string;
  roleId?: number;
}

export interface EndpointCreateResponse extends Endpoint {
  generatedUsername: string;
  agentNumber: number;
}

export interface EndpointUpdateRequest {
  password?: string;
  context?: string;
  transport?: string;
  callerid?: string;
  codecs?: string;
  directMedia?: string;
  dtmfMode?: string;
  maxContacts?: number;
  mailboxes?: string;
  roleId?: number;
}

export interface EndpointStatus {
  deviceState: string;
  contactStatus: string;
  activeChannels: number;
}

export interface EndpointDetails {
  endpoint: Endpoint;
  amiData: {
    DeviceState: string;
    ActiveChannels: number;
    Contacts: Array<{
      Contact: string;
      Status: string;
      RoundtripUsec: string;
      UserAgent?: string;
    }>;
  };
}

export interface EndpointCredentials {
  username: string;
  password: string;
  server: string;
  port: number;
  displayName: string;
  realm: string;
  endpointId: string;
}

class EndpointsService {
  // Get all endpoints
  async getEndpoints(filters?: { context?: string; transport?: string }): Promise<Endpoint[]> {
    const params = new URLSearchParams(filters as any).toString();
    const response = await apiClient.get<ApiResponse<Endpoint[]>>(`/endpoints${params ? `?${params}` : ''}`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch endpoints');
  }

  // Get enriched endpoints with AMI data
  async getEnrichedEndpoints(): Promise<Endpoint[]> {
    const response = await apiClient.get<ApiResponse<{
      data: Endpoint[];
      total: number;
      page: number;
      limit: number;
    }>>('/endpoints/enriched/all');

    if (response.data.success && response.data.data) {
      // Backend returns paginated structure: { data: { data: [...], total, page, limit } }
      return response.data.data.data;
    }

    throw new Error('Failed to fetch enriched endpoints');
  }

  // Get endpoint by username
  async getEndpoint(username: string): Promise<Endpoint> {
    const response = await apiClient.get<ApiResponse<Endpoint>>(`/endpoints/${username}`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch endpoint');
  }

  // Get endpoint status from AMI
  async getEndpointStatus(username: string): Promise<EndpointStatus> {
    const response = await apiClient.get<ApiResponse<EndpointStatus>>(`/endpoints/${username}/status`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch endpoint status');
  }

  // Get endpoint details from AMI
  async getEndpointDetails(username: string): Promise<EndpointDetails> {
    const response = await apiClient.get<ApiResponse<EndpointDetails>>(`/endpoints/${username}/details`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch endpoint details');
  }

  // Create new endpoint
  async createEndpoint(data: EndpointCreateRequest): Promise<EndpointCreateResponse> {
    const response = await apiClient.post<ApiResponse<EndpointCreateResponse>>('/endpoints', data);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to create endpoint');
  }

  // Update endpoint
  async updateEndpoint(username: string, data: EndpointUpdateRequest): Promise<Endpoint> {
    const response = await apiClient.patch<ApiResponse<Endpoint>>(`/endpoints/${username}`, data);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to update endpoint');
  }

  // Delete endpoint
  async deleteEndpoint(username: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse>(`/endpoints/${username}`);

    if (!response.data.success) {
      throw new Error('Failed to delete endpoint');
    }
  }

  // Force disconnect endpoint
  async disconnectEndpoint(username: string): Promise<void> {
    const response = await apiClient.post<ApiResponse>(`/endpoints/${username}/disconnect`);

    if (!response.data.success) {
      throw new Error('Failed to disconnect endpoint');
    }
  }

  // Get endpoint SIP credentials (Admin only)
  async getEndpointCredentials(username: string): Promise<EndpointCredentials> {
    const response = await apiClient.get<ApiResponse<EndpointCredentials>>(
      `/endpoints/${username}/credentials`
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch endpoint credentials');
  }

  // Get device state color
  getDeviceStateColor(state?: string): string {
    if (!state) return 'gray';

    switch (state.toUpperCase()) {
      case 'NOT_INUSE':
        return 'green';
      case 'INUSE':
        return 'blue';
      case 'BUSY':
        return 'yellow';
      case 'RINGING':
        return 'purple';
      case 'ONHOLD':
        return 'orange';
      case 'UNAVAILABLE':
      case 'INVALID':
        return 'red';
      default:
        return 'gray';
    }
  }

  // Get device state label
  getDeviceStateLabel(state?: string): string {
    if (!state) return 'Inconnu';

    switch (state.toUpperCase()) {
      case 'NOT_INUSE':
        return 'Disponible';
      case 'INUSE':
        return 'En ligne';
      case 'BUSY':
        return 'Occupé';
      case 'RINGING':
        return 'Sonne';
      case 'ONHOLD':
        return 'En attente';
      case 'UNAVAILABLE':
        return 'Indisponible';
      case 'INVALID':
        return 'Invalide';
      default:
        return state;
    }
  }

  // Get contact status color
  getContactStatusColor(status?: string): string {
    if (!status) return 'gray';

    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('reachable')) return 'green';
    if (lowerStatus.includes('unreachable')) return 'red';
    if (lowerStatus.includes('unknown')) return 'yellow';

    return 'gray';
  }
}

export default new EndpointsService();