import { useState } from 'react';
import { Edit, Trash2, Power, Phone } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

import type { Endpoint } from '@/api/endpoints';
import endpointsService from '@/api/endpoints';
import { RoleBadge } from '@/components/roles/RoleBadge';
import { useEndpointSelectionStore } from '@modules/softphone';

interface EndpointsListProps {
  endpoints: Endpoint[];
  onEdit: (endpoint: Endpoint) => void;
  onRefresh: () => void;
}

export default function EndpointsList({
  endpoints,
  onEdit,
  onRefresh,
}: EndpointsListProps) {
  const [deleteEndpoint, setDeleteEndpoint] = useState<Endpoint | null>(null);
  const [disconnectEndpoint, setDisconnectEndpoint] = useState<Endpoint | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const { toast } = useToast();

  // Endpoint selection for softphone
  const selectEndpoint = useEndpointSelectionStore((state) => state.selectEndpoint);

  // Get device state badge variant
  const getDeviceStateBadge = (state?: string) => {
    if (!state) return { variant: 'gray' as const, label: 'Inconnu' };

    const color = endpointsService.getDeviceStateColor(state);
    const label = endpointsService.getDeviceStateLabel(state);

    const variantMap: Record<string, any> = {
      green: 'success',
      blue: 'info',
      yellow: 'warning',
      orange: 'orange',
      purple: 'purple',
      red: 'destructive',
      gray: 'gray',
    };

    return {
      variant: variantMap[color] || 'gray',
      label,
    };
  };

  // Get contact status badge variant
  const getContactStatusBadge = (status?: string) => {
    if (!status) return { variant: 'gray' as const, label: 'Inconnu' };

    const color = endpointsService.getContactStatusColor(status);

    const variantMap: Record<string, any> = {
      green: 'success',
      red: 'destructive',
      yellow: 'warning',
      gray: 'gray',
    };

    return {
      variant: variantMap[color] || 'gray',
      label: status,
    };
  };

  // Handle connect to endpoint with softphone
  const handleConnectEndpoint = async (endpoint: Endpoint) => {
    try {
      await selectEndpoint(endpoint);

      toast({
        title: 'Connexion au softphone',
        description: `Connecté en tant que ${endpoint.callerid || endpoint.displayName}`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur de connexion',
        description: error instanceof Error ? error.message : 'Impossible de se connecter',
      });
    }
  };

  // Handle delete endpoint
  const handleDeleteEndpoint = async () => {
    if (!deleteEndpoint) return;

    setIsDeleting(true);

    try {
      await endpointsService.deleteEndpoint(deleteEndpoint.id);

      toast({
        title: 'Endpoint supprimé',
        description: `L'endpoint ${deleteEndpoint.displayName} a été supprimé avec succès.`,
        variant: 'success',
      });

      setDeleteEndpoint(null);
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.error?.message || 'Impossible de supprimer l\'endpoint',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle disconnect endpoint
  const handleDisconnectEndpoint = async () => {
    if (!disconnectEndpoint) return;

    setIsDisconnecting(true);

    try {
      await endpointsService.disconnectEndpoint(disconnectEndpoint.id);

      toast({
        title: 'Endpoint déconnecté',
        description: `L'endpoint ${disconnectEndpoint.displayName} a été déconnecté avec succès.`,
        variant: 'success',
      });

      setDisconnectEndpoint(null);
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.error?.message || 'Impossible de déconnecter l\'endpoint',
        variant: 'destructive',
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (endpoints.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-sm">
          Aucun endpoint trouvé. Créez-en un pour commencer.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Caller ID</TableHead>
              <TableHead>Contexte</TableHead>
              <TableHead>Transport</TableHead>
              <TableHead>État Device</TableHead>
              <TableHead>Contact Status</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Canaux Actifs</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {endpoints.map((endpoint) => {
              const deviceState = getDeviceStateBadge(endpoint.deviceState);
              const contactStatus = getContactStatusBadge(endpoint.contactStatus);

              return (
                <TableRow key={endpoint.id}>
                  <TableCell className="font-medium">
                    {endpoint.displayName}
                  </TableCell>
                  <TableCell>
                    {endpoint.role ? (
                      <RoleBadge role={endpoint.role} size="sm" />
                    ) : (
                      <span className="text-xs text-muted-foreground">Aucun rôle</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {endpoint.callerid || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-mono">{endpoint.context}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{endpoint.transport}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={deviceState.variant}>
                      {deviceState.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={contactStatus.variant}>
                      {contactStatus.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {endpoint.contactIP ? (
                      <span className="text-sm font-mono">{endpoint.contactIP}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {endpoint.activeChannels || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleConnectEndpoint(endpoint)}
                        title="Connecter au softphone"
                      >
                        <Phone className="h-4 w-4 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(endpoint)}
                        title="Modifier"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDisconnectEndpoint(endpoint)}
                        title="Déconnecter"
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteEndpoint(endpoint)}
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteEndpoint} onOpenChange={(open) => !open && setDeleteEndpoint(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'endpoint{' '}
              <strong>{deleteEndpoint?.displayName}</strong> ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEndpoint}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog
        open={!!disconnectEndpoint}
        onOpenChange={(open) => !open && setDisconnectEndpoint(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la déconnexion</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir déconnecter l'endpoint{' '}
              <strong>{disconnectEndpoint?.displayName}</strong> ?
              Cela fermera toutes les connexions actives.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDisconnecting}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnectEndpoint}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? 'Déconnexion...' : 'Déconnecter'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
