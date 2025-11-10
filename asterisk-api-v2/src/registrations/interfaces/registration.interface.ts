import { Tenant } from '../../core/database/entities/tenant.entity';

/**
 * SIP Trunk Registration interface
 * Represents a PJSIP outbound registration configured via pjsip_wizard.conf
 */
export interface SipTrunkRegistration {
  /** Unique identifier for the trunk (e.g., 'operator_trunk') */
  id: string;

  /** Wizard type - always 'wizard' for pjsip_wizard entries */
  type: 'wizard';

  /** Enable sending registrations to remote host */
  sends_registrations: boolean;

  /** Enable authentication for the registration */
  sends_auth: boolean;

  /** Remote SIP server (IP:PORT or hostname:PORT) */
  remote_hosts: string;

  /** Outbound authentication credentials */
  outbound_auth: {
    username: string;
    password: string;
  };

  /** Endpoint configuration */
  endpoint: {
    /** Transport to use (e.g., 'transport-udp', 'transport-wss') */
    transport: string;
    /** Dialplan context for incoming calls */
    context: string;
  };

  /** Client URI (optional, defaults to sip:username@remote_hosts) */
  client_uri?: string;

  /** Server URI (optional, defaults to sip:remote_hosts) */
  server_uri?: string;

  /** Retry interval in seconds (default: 60) */
  retry_interval?: number;

  /** Registration expiration in seconds (default: 3600) */
  expiration?: number;

  /** Maximum retry attempts (default: 10) */
  max_retries?: number;

  /** Forbidden retry interval in seconds (default: 0) */
  forbidden_retry_interval?: number;

  /** Enable line parameter (default: false) */
  line?: boolean;

  /** Outbound proxy (optional) */
  outbound_proxy?: string;

  /** Enable path support (default: false) */
  support_path?: boolean;

  /** Destination type for incoming calls (optional) */
  destination_type?: string;

  /** Destination identifier - queue name, extension number, or IVR menu ID (optional) */
  destination_id?: string;

  /** DID pattern to match incoming calls (optional, default: '_X.') */
  did_pattern?: string;

  // Metadata fields
  /** Tenant ID this trunk belongs to (null for global trunks) */
  tenantId: number | null;

  /** Full tenant object (loaded with relations) */
  tenant?: Tenant;

  /** Display name for the trunk (optional) */
  displayName?: string;

  /** Description of the trunk (optional) */
  description?: string;

  /** Whether the trunk is enabled (default: true) */
  enabled: boolean;

  /** Creation timestamp */
  createdAt?: Date;

  /** Last update timestamp */
  updatedAt?: Date;
}

/**
 * Registration status from Asterisk AMI
 */
export interface RegistrationStatus {
  /** Registration ID */
  id: string;

  /** Server URI */
  server_uri: string;

  /** Authentication object */
  auth: string;

  /** Status: Registered, Rejected, Unregistered */
  status: 'Registered' | 'Rejected' | 'Unregistered' | 'Unknown';

  /** Expiration info (e.g., "exp. 3600s" or "exp. 5000s ago") */
  expiration?: string;
}

/**
 * Combined registration info with config and status
 */
export interface RegistrationWithStatus extends SipTrunkRegistration {
  /** Current registration status from Asterisk */
  status: RegistrationStatus;
}
