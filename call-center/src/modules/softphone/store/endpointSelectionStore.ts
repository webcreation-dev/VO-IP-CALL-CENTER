/**
 * Endpoint Selection Store
 *
 * Manages the selected endpoint for admin softphone connection
 * Stores credentials in memory only (not persisted for security)
 */

import { create } from 'zustand';
import { useMemo } from 'react';
import type { Endpoint, EndpointCredentials } from '@/api/endpoints';
import endpointsService from '@/api/endpoints';
import type { SipConfig } from '../core/types';

interface EndpointSelectionState {
  // State
  selectedEndpoint: Endpoint | null;
  credentials: EndpointCredentials | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  selectEndpoint: (endpoint: Endpoint) => Promise<void>;
  clearSelection: () => void;
  getSipConfig: () => SipConfig | null;
}

/**
 * Zustand store for endpoint selection
 * NOT persisted - credentials stay in memory only for security
 */
export const useEndpointSelectionStore = create<EndpointSelectionState>((set, get) => ({
  // Initial state
  selectedEndpoint: null,
  credentials: null,
  isLoading: false,
  error: null,

  // Select an endpoint and fetch its credentials
  selectEndpoint: async (endpoint: Endpoint) => {
    set({ isLoading: true, error: null });

    try {
      // Fetch credentials from backend
      // Use displayName if available, otherwise fallback to id
      const username = endpoint.displayName || endpoint.id;
      const credentials = await endpointsService.getEndpointCredentials(username);

      set({
        selectedEndpoint: endpoint,
        credentials,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch credentials';

      set({
        selectedEndpoint: null,
        credentials: null,
        isLoading: false,
        error: errorMessage,
      });

      throw error;
    }
  },

  // Clear the selected endpoint
  clearSelection: () => {
    set({
      selectedEndpoint: null,
      credentials: null,
      error: null,
    });
  },

  // Get SipConfig from current credentials
  getSipConfig: (): SipConfig | null => {
    const { credentials } = get();

    if (!credentials) {
      return null;
    }

    return {
      server: credentials.server,
      domain: credentials.domain,
      port: credentials.port,
      username: credentials.username,
      password: credentials.password,
      displayName: credentials.displayName,
      realm: credentials.realm,
      endpointId: credentials.endpointId,
    };
  },
}));

/**
 * Helper hook to get the current SIP config
 * Uses useMemo to avoid creating new object on every render (prevents infinite loop)
 */
export function useSelectedEndpointConfig(): SipConfig | null {
  const credentials = useEndpointSelectionStore((state) => state.credentials);

  return useMemo(() => {
    if (!credentials) {
      return null;
    }

    return {
      server: credentials.server,
      domain: credentials.domain,
      port: credentials.port,
      username: credentials.username,
      password: credentials.password,
      displayName: credentials.displayName,
      realm: credentials.realm,
      endpointId: credentials.endpointId,
    };
  }, [credentials]);
}

/**
 * Helper hook to check if an endpoint is selected
 */
export function useHasSelectedEndpoint(): boolean {
  return useEndpointSelectionStore((state) => state.selectedEndpoint !== null);
}
