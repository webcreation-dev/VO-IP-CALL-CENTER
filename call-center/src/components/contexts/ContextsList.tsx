import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
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

import contextsService, { type TenantContext } from '@/api/contexts';
import { UserRole } from '@/api/auth';
import useAuthStore from '@/store/authStore';

interface ContextsListProps {
  contexts: TenantContext[];
  onEdit: (context: TenantContext) => void;
  onRefresh: () => void;
}

export default function ContextsList({ contexts, onEdit, onRefresh }: ContextsListProps) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contextToDelete, setContextToDelete] = useState<TenantContext | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if user can delete contexts (ADMIN or TENANT_ADMIN)
  const canDelete = user && (
    user.role === UserRole.ADMIN ||
    user.role === UserRole.TENANT_ADMIN
  );

  const handleDeleteClick = (context: TenantContext) => {
    if (!contextsService.canDelete(context)) {
      toast({
        variant: 'destructive',
        title: 'Action interdite',
        description: 'Le contexte principal ne peut pas être supprimé.',
      });
      return;
    }

    setContextToDelete(context);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contextToDelete) return;

    setIsDeleting(true);

    try {
      await contextsService.delete(contextToDelete.id);

      toast({
        title: 'Contexte supprimé',
        description: `Le contexte "${contextToDelete.name}" a été supprimé avec succès.`,
      });

      onRefresh();
      setDeleteDialogOpen(false);
      setContextToDelete(null);
    } catch (error: any) {
      console.error('Error deleting context:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.response?.data?.error?.message || 'Une erreur est survenue lors de la suppression du contexte.',
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

  if (contexts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Aucun contexte trouvé</p>
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
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Configuration</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contexts.map((context) => {
              const displayName = contextsService.getDisplayName(context);
              const canDeleteThis = contextsService.canDelete(context);

              return (
                <TableRow key={context.id}>
                  {/* Name (without prefix) */}
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{displayName}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {context.name}
                      </span>
                    </div>
                  </TableCell>

                  {/* Description */}
                  <TableCell>
                    {context.description ? (
                      <span className="text-sm">{context.description}</span>
                    ) : (
                      <span className="text-muted-foreground italic">-</span>
                    )}
                  </TableCell>

                  {/* Primary Badge */}
                  <TableCell>
                    <Badge
                      variant={context.isPrimary ? 'default' : 'outline'}
                      className={context.isPrimary ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                      {context.isPrimary ? 'Principal' : 'Secondaire'}
                    </Badge>
                  </TableCell>

                  {/* Dialplan Config Summary */}
                  <TableCell>
                    {context.dialplanConfig?.allowInterContext &&
                     context.dialplanConfig?.allowedContexts &&
                     context.dialplanConfig.allowedContexts.length > 0 ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm text-muted-foreground cursor-help underline decoration-dotted">
                              {contextsService.getDialplanSummary(context.dialplanConfig)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="font-semibold mb-1">Contextes autorisés :</p>
                            <ul className="list-disc list-inside space-y-0.5">
                              {context.dialplanConfig.allowedContexts.map((ctxName) => (
                                <li key={ctxName} className="text-xs">
                                  {ctxName}
                                </li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {contextsService.getDialplanSummary(context.dialplanConfig)}
                      </span>
                    )}
                  </TableCell>

                  {/* Created At */}
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(context.createdAt)}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {/* Edit Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(context)}
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      {/* Delete Button (with tooltip for primary) */}
                      {canDelete && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteClick(context)}
                                  title="Supprimer"
                                  disabled={!canDeleteThis}
                                  className={
                                    canDeleteThis
                                      ? 'text-destructive hover:text-destructive hover:bg-destructive/10'
                                      : 'cursor-not-allowed'
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {!canDeleteThis && (
                              <TooltipContent>
                                <p>Le contexte principal ne peut pas être supprimé</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le contexte{' '}
              <span className="font-semibold">{contextToDelete?.name}</span> ?
              <br />
              <br />
              Cette action supprimera le contexte et peut affecter les extensions et les routes d'appel associées.
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
    </>
  );
}
