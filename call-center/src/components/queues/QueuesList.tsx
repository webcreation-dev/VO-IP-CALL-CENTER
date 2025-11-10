import { useState } from 'react';
import { Pencil, Trash2, Users, Phone, Clock, TrendingUp, UserCog } from 'lucide-react';
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

import queuesService, { type QueueEnriched } from '@/api/queues';
import { UserRole } from '@/api/auth';
import useAuthStore from '@/store/authStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import QueueMembersManager from './QueueMembersManager';

interface QueuesListProps {
  queues: QueueEnriched[];
  onEdit: (queue: QueueEnriched) => void;
  onRefresh: () => void;
}

export default function QueuesList({ queues, onEdit, onRefresh }: QueuesListProps) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [queueToDelete, setQueueToDelete] = useState<QueueEnriched | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedQueueForMembers, setSelectedQueueForMembers] = useState<string | null>(null);

  // Check if user can delete queues (ADMIN or TENANT_ADMIN)
  const canDelete = user && (
    user.role === UserRole.ADMIN ||
    user.role === UserRole.TENANT_ADMIN
  );

  // Check if user can manage members
  const canManageMembers = user && (
    user.role === UserRole.ADMIN ||
    user.role === UserRole.TENANT_ADMIN ||
    user.role === UserRole.SUPERVISOR
  );

  const handleDeleteClick = (queue: QueueEnriched) => {
    setQueueToDelete(queue);
    setDeleteDialogOpen(true);
  };

  const handleManageMembersClick = (queueName: string) => {
    setSelectedQueueForMembers(queueName);
    setMembersDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!queueToDelete) return;

    setIsDeleting(true);

    try {
      await queuesService.delete(queueToDelete.name);

      toast({
        title: 'File d\'attente supprimée',
        description: `La file "${queueToDelete.name}" a été supprimée avec succès.`,
      });

      onRefresh();
      setDeleteDialogOpen(false);
      setQueueToDelete(null);
    } catch (error: any) {
      console.error('Error deleting queue:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.response?.data?.error?.message || 'Une erreur est survenue lors de la suppression de la file.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy HH:mm', { locale: fr });
    } catch {
      return dateString;
    }
  };

  if (queues.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Aucune file d'attente trouvée</p>
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
              <TableHead>Stratégie</TableHead>
              <TableHead className="text-center">État</TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Phone className="h-3 w-3" />
                  Appels
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Users className="h-3 w-3" />
                  Agents
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Clock className="h-3 w-3" />
                  Temps max
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Utilisation
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queues.map((queue) => {
              const displayName = queuesService.getDisplayName(queue);

              return (
                <TableRow key={queue.name}>
                  {/* Name */}
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{displayName}</span>
                      {queue.description && (
                        <span className="text-xs text-muted-foreground">
                          {queue.description}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground font-mono">
                        {queue.name}
                      </span>
                    </div>
                  </TableCell>

                  {/* Strategy */}
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="outline" className="text-xs">
                            {queue.strategy}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{queuesService.getStrategyLabel(queue.strategy)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>

                  {/* Visual State */}
                  <TableCell className="text-center">
                    <Badge variant={queuesService.getVisualStateBadgeVariant(queue.visual_state)}>
                      {queuesService.getVisualStateLabel(queue.visual_state)}
                    </Badge>
                  </TableCell>

                  {/* Calls Waiting */}
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <span className={`font-mono font-semibold ${
                        queue.calls_waiting > 5 ? 'text-destructive' :
                        queue.calls_waiting > 2 ? 'text-yellow-600' :
                        'text-foreground'
                      }`}>
                        {queue.calls_waiting}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {queue.calls_total} total
                      </span>
                    </div>
                  </TableCell>

                  {/* Agents */}
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <span className="font-mono font-semibold">
                        {queue.members_available}/{queue.members_total}
                      </span>
                      <div className="flex gap-1 text-xs text-muted-foreground">
                        <span>{queue.members_in_call} en appel</span>
                        {queue.members_paused > 0 && (
                          <span>• {queue.members_paused} pause</span>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Longest Wait Time */}
                  <TableCell className="text-center">
                    <span className={`font-mono ${
                      queue.longest_wait_time > 300 ? 'text-destructive font-semibold' :
                      queue.longest_wait_time > 120 ? 'text-yellow-600' :
                      'text-foreground'
                    }`}>
                      {queuesService.formatTime(queue.longest_wait_time)}
                    </span>
                  </TableCell>

                  {/* Agent Utilization */}
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <span className="font-mono font-semibold">
                        {queuesService.formatPercentage(queue.agent_utilization)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {queuesService.formatPercentage(queue.service_level_perf)} SLA
                      </span>
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {/* Manage Members Button */}
                      {canManageMembers && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleManageMembersClick(queue.name)}
                          title="Gérer les agents"
                        >
                          <UserCog className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Edit Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(queue)}
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      {/* Delete Button (Admin only) */}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(queue)}
                          title="Supprimer"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* AMI Connection Status */}
      {queues.length > 0 && !queues[0].ami_connected && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ Les statistiques en temps réel ne sont pas disponibles (AMI déconnecté). Les données affichées proviennent de la base de données.
          </p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la file d'attente{' '}
              <span className="font-semibold">{queueToDelete?.name}</span> ?
              <br />
              <br />
              Cette action supprimera la file et tous ses membres. Les appels en cours seront terminés mais aucun nouvel appel ne sera accepté.
              <br />
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

      {/* Queue Members Management Dialog */}
      <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestion des agents</DialogTitle>
          </DialogHeader>
          {selectedQueueForMembers && (
            <QueueMembersManager queueName={selectedQueueForMembers} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
