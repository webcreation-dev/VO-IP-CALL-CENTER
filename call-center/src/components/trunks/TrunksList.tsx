import { useState } from 'react';
import { Pencil, Trash2, PlayCircle, Server, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useToast } from '@/components/ui/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import trunksService, { type TrunkWithStatus } from '@/api/trunks';
import { UserRole } from '@/api/auth';
import useAuthStore from '@/store/authStore';
import TrunkAssociationModal from './TrunkAssociationModal';

interface TrunksListProps {
  trunks: TrunkWithStatus[];
  onEdit: (trunk: TrunkWithStatus) => void;
  onRefresh: () => void;
}

export default function TrunksList({ trunks, onEdit, onRefresh }: TrunksListProps) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [trunkToDelete, setTrunkToDelete] = useState<TrunkWithStatus | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [registeringTrunk, setRegisteringTrunk] = useState<string | null>(null);
  const [associationModalOpen, setAssociationModalOpen] = useState(false);
  const [trunkToAssociate, setTrunkToAssociate] = useState<TrunkWithStatus | null>(null);

  // Only ADMIN can delete
  const canDelete = user?.role === UserRole.ADMIN;

  const handleDeleteClick = (trunk: TrunkWithStatus) => {
    setTrunkToDelete(trunk);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!trunkToDelete) return;

    setIsDeleting(true);

    try {
      await trunksService.delete(trunkToDelete.id);

      toast({
        title: 'Trunk supprimé',
        description: `Le trunk "${trunksService.getDisplayName(trunkToDelete)}" a été supprimé avec succès.`,
      });

      onRefresh();
      setDeleteDialogOpen(false);
      setTrunkToDelete(null);
    } catch (error: any) {
      console.error('Error deleting trunk:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.response?.data?.error?.message || 'Une erreur est survenue lors de la suppression du trunk.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleForceRegister = async (trunk: TrunkWithStatus) => {
    setRegisteringTrunk(trunk.id);

    try {
      await trunksService.forceRegister(trunk.id);

      toast({
        title: 'Registration initiée',
        description: `Tentative de registration pour "${trunksService.getDisplayName(trunk)}"`,
      });

      // Refresh after a short delay to get updated status
      setTimeout(() => {
        onRefresh();
      }, 2000);
    } catch (error: any) {
      console.error('Error forcing registration:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.response?.data?.error?.message || 'Impossible de forcer la registration.',
      });
    } finally {
      setRegisteringTrunk(null);
    }
  };

  const handleAssociationClick = (trunk: TrunkWithStatus) => {
    setTrunkToAssociate(trunk);
    setAssociationModalOpen(true);
  };

  const handleAssociationSuccess = () => {
    onRefresh();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd MMM yyyy HH:mm', { locale: fr });
    } catch {
      return dateString;
    }
  };

  if (trunks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Aucun trunk trouvé</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Serveur SIP</TableHead>
              <TableHead>Transport</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trunks.map((trunk) => (
              <TableRow key={trunk.id}>
                {/* Name */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {trunksService.getDisplayName(trunk)}
                      </div>
                      {trunk.description && (
                        <div className="text-xs text-muted-foreground">
                          {trunk.description}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Remote Host */}
                <TableCell>
                  <div className="font-mono text-sm">{trunk.remoteHost}</div>
                  <div className="text-xs text-muted-foreground">
                    {trunk.username}
                  </div>
                </TableCell>

                {/* Transport */}
                <TableCell>
                  <Badge variant="outline" className="font-mono text-xs">
                    {trunksService.getTransportLabel(trunk.transport)}
                  </Badge>
                </TableCell>

                {/* Tenant */}
                <TableCell>
                  {trunk.tenantId !== null ? (
                    <span className="text-sm">Tenant {trunk.tenantId}</span>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Non associé
                    </Badge>
                  )}
                </TableCell>

                {/* Registration Status */}
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge
                      variant={trunksService.getStatusBadgeVariant(
                        trunk.registrationStatus?.status
                      )}
                    >
                      {trunksService.getStatusLabel(trunk.registrationStatus?.status)}
                    </Badge>
                    {trunk.registrationStatus?.expiration && (
                      <span className="text-xs text-muted-foreground">
                        {trunksService.formatExpiration(trunk.registrationStatus.expiration)}
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Destination */}
                <TableCell>
                  {trunk.destinationType ? (
                    <div>
                      <div className="text-sm font-medium">
                        {trunksService.getDestinationTypeLabel(trunk.destinationType)}
                      </div>
                      {trunk.destinationId && (
                        <div className="text-xs text-muted-foreground">
                          {trunk.destinationId}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic text-sm">
                      Non configuré
                    </span>
                  )}
                </TableCell>

                {/* Created At */}
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(trunk.createdAt)}
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {/* Associate Tenant Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleAssociationClick(trunk)}
                          title={trunk.tenantId !== null ? 'Gérer l\'association' : 'Associer un tenant'}
                        >
                          <LinkIcon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{trunk.tenantId !== null ? 'Gérer l\'association' : 'Associer un tenant'}</p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Force Register Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleForceRegister(trunk)}
                          disabled={registeringTrunk === trunk.id}
                          title="Forcer la registration"
                        >
                          <PlayCircle
                            className={`h-4 w-4 ${
                              registeringTrunk === trunk.id ? 'animate-spin' : ''
                            }`}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Forcer la registration</p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Edit Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(trunk)}
                          title="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Modifier le trunk</p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Delete Button (Admin only) */}
                    {canDelete && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(trunk)}
                            title="Supprimer"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Supprimer le trunk</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le trunk{' '}
              <span className="font-semibold">
                {trunkToDelete && trunksService.getDisplayName(trunkToDelete)}
              </span>{' '}
              ?
              <br />
              <br />
              Cette action supprimera :
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>La configuration du trunk dans pjsip_wizard.conf</li>
                <li>Les extensions de routing associées</li>
                <li>L'enregistrement SIP actif</li>
              </ul>
              <br />
              <span className="text-destructive font-semibold">
                Cette action est irréversible.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Trunk Association Modal */}
      <TrunkAssociationModal
        trunk={trunkToAssociate}
        open={associationModalOpen}
        onClose={() => setAssociationModalOpen(false)}
        onSuccess={handleAssociationSuccess}
      />
    </TooltipProvider>
  );
}
