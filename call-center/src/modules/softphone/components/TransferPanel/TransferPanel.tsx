/**
 * TransferPanel Component
 *
 * Panel for blind transfer with manual extension input and endpoint selection
 */

import { useState, useEffect } from 'react';
import { PhoneForwarded, X, Loader2, Users, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import endpointsService, { type Endpoint } from '@/api/endpoints';

interface TransferPanelProps {
  onTransfer: (extension: string) => Promise<void>;
  onCancel: () => void;
  isTransferring?: boolean;
}

export function TransferPanel({
  onTransfer,
  onCancel,
  isTransferring = false,
}: TransferPanelProps) {
  const [extension, setExtension] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('');
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [isLoadingEndpoints, setIsLoadingEndpoints] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available endpoints on mount
  useEffect(() => {
    const fetchEndpoints = async () => {
      try {
        setIsLoadingEndpoints(true);
        const data = await endpointsService.getEndpoints();
        // Filter only online endpoints (those with contactStatus)
        const availableEndpoints = data.filter(
          (ep) => ep.contactStatus === 'Reachable' || ep.contactStatus === 'NonQualified'
        );
        setEndpoints(availableEndpoints);
      } catch (err) {
        console.error('Failed to fetch endpoints:', err);
        // Still show empty list, user can type manually
      } finally {
        setIsLoadingEndpoints(false);
      }
    };

    fetchEndpoints();
  }, []);

  // Extract extension number from endpoint ID (e.g., "t24_1000" -> "1000")
  const extractExtension = (endpointId: string): string => {
    const match = endpointId.match(/t\d+_(\d+)/);
    return match ? match[1] : endpointId;
  };

  // Handle endpoint selection
  const handleEndpointChange = (value: string) => {
    setSelectedEndpoint(value);
    if (value) {
      setExtension(extractExtension(value));
    }
  };

  // Handle transfer
  const handleTransfer = async () => {
    const targetExtension = extension.trim();
    if (!targetExtension) {
      setError('Veuillez saisir une extension');
      return;
    }

    setError(null);

    try {
      await onTransfer(targetExtension);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec du transfert');
    }
  };

  return (
    <div className="p-3 border-t bg-muted/30 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <PhoneForwarded className="h-4 w-4 text-primary" />
          <span>Transférer l'appel</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onCancel}
          disabled={isTransferring}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Endpoint Selection */}
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1">
          <Users className="h-3 w-3" />
          Sélectionner un agent
        </Label>
        <Select
          value={selectedEndpoint}
          onValueChange={handleEndpointChange}
          disabled={isTransferring || isLoadingEndpoints}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder={isLoadingEndpoints ? 'Chargement...' : 'Choisir un agent'} />
          </SelectTrigger>
          <SelectContent>
            {endpoints.length === 0 && !isLoadingEndpoints ? (
              <div className="py-2 px-3 text-sm text-muted-foreground">
                Aucun agent disponible
              </div>
            ) : (
              endpoints.map((endpoint) => (
                <SelectItem key={endpoint.id} value={endpoint.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        endpoint.contactStatus === 'Reachable'
                          ? 'bg-green-500'
                          : 'bg-yellow-500'
                      }`}
                    />
                    <span>{endpoint.callerid || endpoint.displayName}</span>
                    <span className="text-muted-foreground">
                      ({extractExtension(endpoint.id)})
                    </span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Manual Extension Input */}
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1">
          <Hash className="h-3 w-3" />
          Ou saisir une extension
        </Label>
        <Input
          type="text"
          value={extension}
          onChange={(e) => {
            setExtension(e.target.value);
            setSelectedEndpoint(''); // Clear selection when typing
          }}
          placeholder="Ex: 1001"
          className="h-8 text-sm"
          disabled={isTransferring}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && extension.trim()) {
              handleTransfer();
            }
          }}
        />
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {/* Transfer Button */}
      <Button
        onClick={handleTransfer}
        disabled={!extension.trim() || isTransferring}
        className="w-full h-8"
        size="sm"
      >
        {isTransferring ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Transfert en cours...
          </>
        ) : (
          <>
            <PhoneForwarded className="h-4 w-4 mr-2" />
            Transférer vers {extension || '...'}
          </>
        )}
      </Button>
    </div>
  );
}
