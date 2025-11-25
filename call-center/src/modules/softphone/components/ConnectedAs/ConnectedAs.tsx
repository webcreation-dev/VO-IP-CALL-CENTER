/**
 * ConnectedAs Component
 *
 * Displays which endpoint the admin is currently connected as
 * Shows in the softphone widget header
 */

import { User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEndpointSelectionStore } from '../../store/endpointSelectionStore';

export function ConnectedAs() {
  const selectedEndpoint = useEndpointSelectionStore((state) => state.selectedEndpoint);
  const clearSelection = useEndpointSelectionStore((state) => state.clearSelection);

  if (!selectedEndpoint) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border-b">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <User className="h-4 w-4 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-primary truncate">
            Connecté en tant que:
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {selectedEndpoint.callerid || selectedEndpoint.displayName}
          </p>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 flex-shrink-0"
        onClick={clearSelection}
        title="Déconnecter"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
