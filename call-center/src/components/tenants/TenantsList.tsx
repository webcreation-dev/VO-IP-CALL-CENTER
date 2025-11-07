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

import tenantsService, { type Tenant } from '@/api/tenants';
import authService, { UserRole } from '@/api/auth';
import useAuthStore from '@/store/authStore';

interface TenantsListProps {
  tenants: Tenant[];
  onEdit: (tenant: Tenant) => void;
  onRefresh: () => void;
}

export default function TenantsList({ tenants, onEdit, onRefresh }: TenantsListProps) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if user can delete tenants (ADMIN only)
  const canDelete = user && (
    user.role === UserRole.SUPER_ADMIN ||
    user.role === UserRole.ADMIN
  );

  const handleDeleteClick = (tenant: Tenant) => {
    setTenantToDelete(tenant);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!tenantToDelete) return;

    setIsDeleting(true);

    try {
      await tenantsService.delete(tenantToDelete.id);

      toast({
        title: 'Tenant supprimé',
        description: `Le tenant "${tenantToDelete.name}" a été supprimé avec succès.`,
      });

      onRefresh();
      setDeleteDialogOpen(false);
      setTenantToDelete(null);
    } catch (error: any) {
      console.error('Error deleting tenant:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.response?.data?.error?.message || 'Une erreur est survenue lors de la suppression du tenant.',
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

  if (tenants.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Aucun tenant trouvé</p>
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
              <TableHead>Entreprise</TableHead>
              <TableHead>Contexte</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-center">Max Endpoints</TableHead>
              <TableHead className="text-center">Max Queues</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow key={tenant.id}>
                {/* Name */}
                <TableCell className="font-medium">{tenant.name}</TableCell>

                {/* Company Name */}
                <TableCell>
                  {tenant.companyName || (
                    <span className="text-muted-foreground italic">-</span>
                  )}
                </TableCell>

                {/* Context */}
                <TableCell>
                  {tenant.context ? (
                    <Badge variant="outline" className="font-mono text-xs">
                      {tenant.context}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground italic">-</span>
                  )}
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge
                    variant={tenantsService.getStatusBadgeVariant(tenant.isActive)}
                  >
                    {tenantsService.getStatusLabel(tenant.isActive)}
                  </Badge>
                </TableCell>

                {/* Max Endpoints */}
                <TableCell className="text-center">
                  <span className="font-mono">{tenant.maxEndpoints}</span>
                </TableCell>

                {/* Max Queues */}
                <TableCell className="text-center">
                  <span className="font-mono">{tenant.maxQueues}</span>
                </TableCell>

                {/* Created At */}
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(tenant.createdAt)}
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {/* Edit Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(tenant)}
                      title="Modifier"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    {/* Delete Button (Admin only) */}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(tenant)}
                        title="Supprimer"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
              Êtes-vous sûr de vouloir supprimer le tenant{' '}
              <span className="font-semibold">{tenantToDelete?.name}</span> ?
              <br />
              <br />
              Cette action supprimera également :
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Tous les contextes associés</li>
                <li>Tous les endpoints du tenant</li>
                <li>Toutes les files d'attente</li>
                <li>Tous les utilisateurs du tenant</li>
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
    </>
  );
}
