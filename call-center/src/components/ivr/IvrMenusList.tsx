import { useState } from 'react';
import { Edit, Trash2, Copy, Hash, Radio, MapPin } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

import ivrService, { type IvrMenuEnriched } from '@/api/ivr';
import useAuthStore from '@/store/authStore';
import { UserRole } from '@/api/auth';

interface IvrMenusListProps {
  menus: IvrMenuEnriched[];
  onEdit?: (menu: IvrMenuEnriched) => void;
  onRefresh?: () => void;
}

export default function IvrMenusList({
  menus,
  onEdit,
  onRefresh,
}: IvrMenusListProps) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [menuToDelete, setMenuToDelete] = useState<IvrMenuEnriched | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Check if user can modify
  const canModify = user && (
    user.role === UserRole.SUPER_ADMIN ||
    user.role === UserRole.ADMIN ||
    user.role === UserRole.TENANT_ADMIN
  );

  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  // Handle delete confirmation
  const handleDeleteClick = (menu: IvrMenuEnriched) => {
    setMenuToDelete(menu);
    setDeleteDialogOpen(true);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!menuToDelete) return;

    setIsDeleting(true);

    try {
      await ivrService.deleteMenu(menuToDelete.id);

      toast({
        title: 'Menu IVR supprimé',
        description: `Le menu "${menuToDelete.name}" a été supprimé avec succès.`,
      });

      setDeleteDialogOpen(false);
      setMenuToDelete(null);
      onRefresh?.();
    } catch (error: any) {
      console.error('Error deleting menu:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description:
          error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Une erreur est survenue lors de la suppression du menu.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle duplicate
  const handleDuplicate = async (menu: IvrMenuEnriched) => {
    setIsDuplicating(true);

    try {
      await ivrService.duplicateMenu(menu.id);

      toast({
        title: 'Menu dupliqué',
        description: `Le menu "${menu.name}" a été dupliqué avec succès.`,
      });

      onRefresh?.();
    } catch (error: any) {
      console.error('Error duplicating menu:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description:
          error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Une erreur est survenue lors de la duplication du menu.',
      });
    } finally {
      setIsDuplicating(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {menus.map((menu) => (
          <Card key={menu.id} className={`${!menu.isActive ? 'opacity-60' : ''}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <Radio className="h-5 w-5 text-primary" />
                    {menu.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {menu.description || 'Aucune description'}
                  </CardDescription>
                </div>
                <Badge variant={menu.isActive ? 'default' : 'secondary'}>
                  {menu.isActive ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-muted rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Hash className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold">{menu.optionsCount || 0}</p>
                    <p className="text-xs text-muted-foreground">Options</p>
                  </div>
                  <div className="p-2 bg-muted rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold">{menu.didsCount || 0}</p>
                    <p className="text-xs text-muted-foreground">DIDs</p>
                  </div>
                  <div className="p-2 bg-muted rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Radio className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold">{menu.conditionsCount || 0}</p>
                    <p className="text-xs text-muted-foreground">Conditions</p>
                  </div>
                </div>

                {/* Configuration Info */}
                <div className="text-xs space-y-1 p-2 bg-muted/50 rounded">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Timeout:</span>
                    <span className="font-mono">{menu.timeout}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tentatives max:</span>
                    <span className="font-mono">{menu.maxRetries}</span>
                  </div>
                  {menu.welcomeMessage && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Message:</span>
                      <span className="font-mono truncate ml-2">{menu.welcomeMessage}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>

            {canModify && (
              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onEdit?.(menu)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Modifier
                </Button>
                {isSuperAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicate(menu)}
                    disabled={isDuplicating}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteClick(menu)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardFooter>
            )}
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce menu IVR ?
              {menuToDelete && (
                <div className="mt-4 p-3 bg-muted rounded-lg space-y-1">
                  <p className="font-semibold">
                    Menu: <span className="font-mono">{menuToDelete.name}</span>
                  </p>
                  {menuToDelete.description && (
                    <p className="text-sm">{menuToDelete.description}</p>
                  )}
                  <div className="text-sm mt-2">
                    <p>Options: {menuToDelete.optionsCount || 0}</p>
                    <p>DIDs mappés: {menuToDelete.didsCount || 0}</p>
                  </div>
                </div>
              )}
              <p className="mt-4 text-destructive font-semibold">
                Cette action est irréversible et supprimera toutes les options et conditions associées.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
