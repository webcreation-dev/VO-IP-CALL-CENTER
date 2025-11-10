import apiClient, { type ApiResponse } from './config';

// Trunk (SIP Registration) Interface
export interface Trunk {
  id: string;                      // Trunk identifier (name)
  name: string;                    // Trunk name (same as id)
  tenantId: number | null;         // Associated tenant (null if global trunk)
  displayName?: string;            // Optional display name
  description?: string;            // Optional description
  enabled: boolean;                // Is trunk enabled?

  // SIP Server Configuration
  remoteHost: string;              // IP:PORT or hostname:PORT
  transport: string;               // Transport protocol (default: transport-udp)

  // Authentication
  username: string;                // SIP username
  password: string;                // SIP password (masked in responses)

  // Registration Options
  sendsRegistrations: boolean;     // Send registrations
  sendsAuth: boolean;              // Send authentication
  clientUri?: string;              // Client URI (optional)
  serverUri?: string;              // Server URI (optional)
  retryInterval: number;           // Retry interval in seconds (10-3600)
  expiration: number;              // Registration expiration (60-7200)
  maxRetries: number;              // Max retry attempts (1-50)
  forbiddenRetryInterval?: number; // Retry interval on 403 (optional)
  line?: boolean;                  // Line support (optional)
  outboundProxy?: string;          // Outbound proxy (optional)
  supportPath?: boolean;           // Support path header (optional)

  // Call Context
  context: string;                 // Asterisk context for incoming calls

  // Routing Configuration
  destinationType?: 'queue' | 'extension' | 'ivr' | null;  // Destination type
  destinationId?: string;          // Destination ID (queue name, extension, IVR ID)
  didPattern?: string;             // DID pattern (default: _X.)

  // Metadata
  createdAt?: string;              // Creation timestamp
  updatedAt?: string;              // Last update timestamp
}

// Registration Status (from AMI)
export interface RegistrationStatus {
  id: string;                      // Registration ID (e.g., "operator_trunk-reg-0")
  server_uri: string;              // Server URI
  auth: string;                    // Auth identifier
  status: string;                  // Status: "Registered", "Unregistered", "Failed", etc.
  expiration?: string;             // Expiration info (e.g., "exp. 3589s")
}

// Trunk with Status
export interface TrunkWithStatus extends Trunk {
  registrationStatus?: RegistrationStatus;
  isRegistered: boolean;           // Helper: true if status === "Registered"
}

// Create Trunk DTO
export interface CreateTrunkDto {
  // Note: tenantId is NOT included - trunks are created as global resources
  name: string;                    // Required (3-40 chars, alphanumeric with -_)
  displayName?: string;            // Optional display name
  description?: string;            // Optional description
  remoteHost: string;              // Required: IP:PORT or hostname:PORT
  username: string;                // Required (1-100 chars)
  password: string;                // Required (1-100 chars)
  transport?: string;              // Optional (default: 'transport-udp')
  context?: string;                // Optional (default: 'from-trunk')
  sendsRegistrations?: boolean;    // Optional (default: true)
  sendsAuth?: boolean;             // Optional (default: true)
  clientUri?: string;              // Optional
  serverUri?: string;              // Optional
  retryInterval?: number;          // Optional (10-3600, default: 60)
  expiration?: number;             // Optional (60-7200, default: 3600)
  maxRetries?: number;             // Optional (1-50, default: 10)
  forbiddenRetryInterval?: number; // Optional (default: 0)
  line?: boolean;                  // Optional (default: false)
  outboundProxy?: string;          // Optional
  supportPath?: boolean;           // Optional (default: false)
  // Note: routing config is NOT included - can only be set after tenant association
}

// Associate Tenant DTO
export interface AssociateTenantDto {
  tenantId: number;                // Required: Tenant ID to associate with trunk
}

// Update Trunk DTO
export interface UpdateTrunkDto {
  displayName?: string;
  description?: string;
  remoteHost?: string;
  username?: string;
  password?: string;
  transport?: string;
  context?: string;
  sendsRegistrations?: boolean;
  sendsAuth?: boolean;
  clientUri?: string;
  serverUri?: string;
  retryInterval?: number;
  expiration?: number;
  maxRetries?: number;
  forbiddenRetryInterval?: number;
  line?: boolean;
  outboundProxy?: string;
  supportPath?: boolean;
  destinationType?: 'queue' | 'extension' | 'ivr' | null;
  destinationId?: string;
  didPattern?: string;
}

// Update Routing DTO
export interface UpdateRoutingDto {
  destinationType?: 'queue' | 'extension' | 'ivr' | null;
  destinationId?: string;
  didPattern?: string;
}

// Transport Options
export const TRANSPORT_OPTIONS = [
  { value: 'transport-udp', label: 'UDP' },
  { value: 'transport-tcp', label: 'TCP' },
  { value: 'transport-tls', label: 'TLS' },
];

// Destination Types
export const DESTINATION_TYPES = [
  { value: 'queue', label: 'File d\'attente (Queue)' },
  { value: 'extension', label: 'Extension' },
  { value: 'ivr', label: 'Menu IVR' },
];

class TrunksService {
  // Get all trunks
  async getAll(withStatus = false): Promise<Trunk[]> {
    const params = withStatus ? { with_status: 'true' } : {};
    const response = await apiClient.get<ApiResponse<Trunk[]>>('/registrations', { params });

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch trunks');
  }

  // Get all trunks with status
  async getAllWithStatus(): Promise<TrunkWithStatus[]> {
    const response = await apiClient.get<ApiResponse<any[]>>('/registrations', {
      params: { with_status: 'true' },
    });

    if (response.data.success && response.data.data) {
      // Map backend "status" field to frontend "registrationStatus"
      return response.data.data.map((trunk) => ({
        ...trunk,
        registrationStatus: trunk.status, // Backend returns "status", frontend expects "registrationStatus"
        isRegistered: trunk.status?.status === 'Registered',
      }));
    }

    throw new Error('Failed to fetch trunks with status');
  }

  // Get trunk by ID
  async getById(id: string, withStatus = false): Promise<Trunk> {
    const params = withStatus ? { with_status: 'true' } : {};
    const response = await apiClient.get<ApiResponse<any>>(
      `/registrations/${encodeURIComponent(id)}`,
      { params }
    );

    if (response.data.success && response.data.data) {
      const trunk = response.data.data;
      // Map backend "status" field to frontend "registrationStatus" if withStatus is true
      if (withStatus && trunk.status) {
        return {
          ...trunk,
          registrationStatus: trunk.status,
          isRegistered: trunk.status?.status === 'Registered',
        };
      }
      return trunk;
    }

    throw new Error(`Failed to fetch trunk ${id}`);
  }

  // Create new trunk
  async create(data: CreateTrunkDto): Promise<Trunk> {
    const response = await apiClient.post<ApiResponse<Trunk>>('/registrations', data);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to create trunk');
  }

  // Update trunk
  async update(id: string, data: UpdateTrunkDto): Promise<Trunk> {
    const response = await apiClient.patch<ApiResponse<Trunk>>(
      `/registrations/${encodeURIComponent(id)}`,
      data
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to update trunk ${id}`);
  }

  // Delete trunk
  async delete(id: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/registrations/${encodeURIComponent(id)}`
    );

    if (!response.data.success) {
      throw new Error(`Failed to delete trunk ${id}`);
    }
  }

  // Force registration
  async forceRegister(id: string): Promise<{ message: string }> {
    const response = await apiClient.post<ApiResponse<{ message: string }>>(
      `/registrations/${encodeURIComponent(id)}/register`
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to force registration for trunk ${id}`);
  }

  // Update routing
  async updateRouting(id: string, data: UpdateRoutingDto): Promise<any> {
    const response = await apiClient.patch<ApiResponse<any>>(
      `/registrations/${encodeURIComponent(id)}/routing`,
      data
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to update routing for trunk ${id}`);
  }

  // Get routing configuration
  async getRouting(id: string): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>(
      `/registrations/${encodeURIComponent(id)}/routing`
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to get routing for trunk ${id}`);
  }

  // Get registration statuses from AMI
  async getRegistrationStatuses(): Promise<RegistrationStatus[]> {
    const response = await apiClient.get<ApiResponse<RegistrationStatus[]>>(
      '/registrations/status/ami'
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to fetch registration statuses');
  }

  // Associate trunk with tenant
  async associateTenant(id: string, data: AssociateTenantDto): Promise<Trunk> {
    const response = await apiClient.post<ApiResponse<Trunk>>(
      `/registrations/${encodeURIComponent(id)}/associate-tenant`,
      data
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to associate trunk ${id} with tenant`);
  }

  // Dissociate trunk from tenant
  async dissociateTenant(id: string): Promise<Trunk> {
    const response = await apiClient.delete<ApiResponse<Trunk>>(
      `/registrations/${encodeURIComponent(id)}/dissociate-tenant`
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(`Failed to dissociate trunk ${id} from tenant`);
  }

  // ========================================
  // Helper Methods
  // ========================================

  // Get display name
  getDisplayName(trunk: Trunk): string {
    return trunk.displayName || trunk.name;
  }

  // Get status badge variant
  getStatusBadgeVariant(status?: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    if (!status) return 'secondary';

    switch (status.toLowerCase()) {
      case 'registered':
        return 'default'; // Green/success
      case 'unregistered':
      case 'not registered':
        return 'secondary'; // Gray
      case 'failed':
      case 'rejected':
        return 'destructive'; // Red/error
      default:
        return 'outline';
    }
  }

  // Get status label
  getStatusLabel(status?: string): string {
    if (!status) return 'Non enregistré';

    switch (status.toLowerCase()) {
      case 'registered':
        return 'Enregistré';
      case 'unregistered':
      case 'not registered':
        return 'Non enregistré';
      case 'failed':
        return 'Échec';
      case 'rejected':
        return 'Rejeté';
      default:
        return status;
    }
  }

  // Get transport label
  getTransportLabel(transport: string): string {
    const found = TRANSPORT_OPTIONS.find((t) => t.value === transport);
    return found ? found.label : transport;
  }

  // Get destination type label
  getDestinationTypeLabel(type?: string | null): string {
    if (!type) return 'Aucune';

    const found = DESTINATION_TYPES.find((d) => d.value === type);
    return found ? found.label : type;
  }

  // Validate remote host format (IP:PORT or hostname:PORT)
  validateRemoteHost(value: string): boolean {
    // Allow IP:PORT or hostname:PORT
    const pattern = /^[a-zA-Z0-9.-]+:\d+$/;
    return pattern.test(value);
  }

  // Validate trunk name (alphanumeric with hyphens/underscores)
  validateTrunkName(value: string): boolean {
    const pattern = /^[a-zA-Z0-9_-]{3,40}$/;
    return pattern.test(value);
  }

  // Format expiration time
  formatExpiration(expiration?: string): string {
    if (!expiration) return 'N/A';

    // Extract seconds from "exp. 3589s" format
    const match = expiration.match(/(\d+)s/);
    if (match) {
      const seconds = parseInt(match[1], 10);
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);

      if (hours > 0) {
        return `${hours}h ${minutes}min`;
      }
      return `${minutes}min`;
    }

    return expiration;
  }
}

export default new TrunksService();
