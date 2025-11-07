import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit, Trash2, Save, X, Phone } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

import ivrService, {
  type IvrDidMapping,
  type CreateIvrDidMappingDto,
  type UpdateIvrDidMappingDto,
} from '@/api/ivr';
import tenantsService from '@/api/tenants';
import useAuthStore from '@/store/authStore';
import { UserRole } from '@/api/auth';

interface IvrDidMappingsTableProps {
  mappings: IvrDidMapping[];
  onRefresh: () => void;
}

// Zod validation schema
const didMappingSchema = z.object({
  tenantId: z.number().min(1, 'Sélectionnez un tenant').optional(),
  did: z
    .string()
    .min(3, 'Le numéro DID doit contenir au moins 3 caractères')
    .max(20, 'Le numéro DID ne peut pas dépasser 20 caractères')
    .regex(/^\+?[0-9]+$/, 'Format invalide (uniquement chiffres et + au début)'),
  menuId: z.number().min(1, 'Sélectionnez un menu'),
  isActive: z.boolean(),
});

type DidMappingFormData = z.infer<typeof didMappingSchema>;

export default function IvrDidMappingsTable({
  mappings,
  onRefresh,
}: IvrDidMappingsTableProps) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mappingToDelete, setMappingToDelete] = useState<IvrDidMapping | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;
  const canModify = user && (
    user.role === UserRole.SUPER_ADMIN ||
    user.role === UserRole.ADMIN ||
    user.role === UserRole.TENANT_ADMIN
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<DidMappingFormData>({
    resolver: zodResolver(didMappingSchema),
    defaultValues: {
      tenantId: user?.tenantId,
      did: '',
      menuId: 0,
      isActive: true,
    },
  });

  // Load tenants for SUPER_ADMIN
  const { data: tenants } = useQuery({
    queryKey: ['tenants', 'active'],
    queryFn: () => tenantsService.getAll({ isActive: true, limit: 100 }),
    enabled: isSuperAdmin,
    staleTime: 5 * 60 * 1000,
  });

  // Load all IVR menus
  const { data: menus } = useQuery({
    queryKey: ['ivr', 'menus'],
    queryFn: () => ivrService.getAllMenus(),
    staleTime: 2 * 60 * 1000,
  });

  // Handle add mapping
  const handleAddClick = () => {
    setIsAdding(true);
    setEditingId(null);
    reset({
      tenantId: user?.tenantId,
      did: '',
      menuId: 0,
      isActive: true,
    });
  };

  // Handle edit mapping
  const handleEditClick = (mapping: IvrDidMapping) => {
    setEditingId(mapping.id);
    setIsAdding(false);
    reset({
      tenantId: mapping.tenantId,
      did: mapping.did,
      menuId: mapping.menuId,
      isActive: mapping.isActive,
    });
  };

  // Handle cancel
  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    reset();
  };

  // Handle form submit
  const onSubmit = async (data: DidMappingFormData) => {
    try {
      if (editingId) {
        // Update existing mapping
        const updateData: UpdateIvrDidMappingDto = {
          did: data.did,
          menuId: Number(data.menuId),
          isActive: data.isActive,
        };

        await ivrService.updateDidMapping(editingId, updateData);

        toast({
          title: 'Mapping mis à jour',
          description: `Le mapping DID "${data.did}" a été mis à jour avec succès.`,
        });
      } else {
        // Create new mapping
        const createData: CreateIvrDidMappingDto = {
          tenantId: data.tenantId,
          did: data.did,
          menuId: Number(data.menuId),
          isActive: data.isActive,
        };

        await ivrService.createDidMapping(createData);

        toast({
          title: 'Mapping créé',
          description: `Le mapping DID "${data.did}" a été créé avec succès.`,
        });
      }

      handleCancel();
      onRefresh();
    } catch (error: any) {
      console.error('Error saving DID mapping:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description:
          error.response?.data?.error?.message ||
          error.response?.data?.message ||
          `Une erreur est survenue lors de ${editingId ? 'la mise à jour' : 'la création'} du mapping.`,
      });
    }
  };

  // Handle delete confirmation
  const handleDeleteClick = (mapping: IvrDidMapping) => {
    setMappingToDelete(mapping);
    setDeleteDialogOpen(true);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!mappingToDelete) return;

    setIsDeleting(true);

    try {
      await ivrService.deleteDidMapping(mappingToDelete.id);

      toast({
        title: 'Mapping supprimé',
        description: `Le mapping DID "${mappingToDelete.did}" a été supprimé avec succès.`,
      });

      setDeleteDialogOpen(false);
      setMappingToDelete(null);
      onRefresh();
    } catch (error: any) {
      console.error('Error deleting DID mapping:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description:
          error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Une erreur est survenue lors de la suppression du mapping.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Mappings DID vers Menus IVR</h3>
        {canModify && !isAdding && !editingId && (
          <Button onClick={handleAddClick} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un mapping
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {isSuperAdmin && <TableHead className="w-[150px]">Tenant</TableHead>}
            <TableHead className="w-[180px]">Numéro DID</TableHead>
            <TableHead>Menu IVR</TableHead>
            <TableHead className="w-[100px] text-center">Statut</TableHead>
            <TableHead className="w-[120px]">Date création</TableHead>
            {canModify && <TableHead className="w-[120px] text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Add/Edit Form Row */}
          {(isAdding || editingId) && (
            <TableRow className="bg-muted/50">
              {isSuperAdmin && (
                <TableCell>
                  <Select
                    value={watch('tenantId')?.toString()}
                    onValueChange={(value) => setValue('tenantId', parseInt(value))}
                    disabled={!!editingId}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants?.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id.toString()}>
                          {tenant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.tenantId && (
                    <p className="text-xs text-destructive mt-1">{errors.tenantId.message}</p>
                  )}
                </TableCell>
              )}
              <TableCell>
                <Input
                  {...register('did')}
                  placeholder="+33123456789"
                  className="h-8"
                />
                {errors.did && (
                  <p className="text-xs text-destructive mt-1">{errors.did.message}</p>
                )}
              </TableCell>
              <TableCell>
                <Select
                  value={watch('menuId')?.toString()}
                  onValueChange={(value) => setValue('menuId', parseInt(value))}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Sélectionner un menu" />
                  </SelectTrigger>
                  <SelectContent>
                    {menus?.map((menu) => (
                      <SelectItem key={menu.id} value={menu.id.toString()}>
                        {menu.name} {menu.description && `- ${menu.description}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.menuId && (
                  <p className="text-xs text-destructive mt-1">{errors.menuId.message}</p>
                )}
              </TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={watch('isActive')}
                  onCheckedChange={(checked) => setValue('isActive', checked)}
                />
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">-</span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={handleSubmit(onSubmit)}
                  >
                    <Save className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={handleCancel}
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}

          {/* Existing Mappings */}
          {mappings.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={canModify ? (isSuperAdmin ? 6 : 5) : (isSuperAdmin ? 5 : 4)}
                className="text-center text-muted-foreground py-8"
              >
                Aucun mapping DID configuré. Cliquez sur "Ajouter un mapping" pour commencer.
              </TableCell>
            </TableRow>
          ) : (
            mappings.map((mapping) => (
              <TableRow key={mapping.id}>
                {isSuperAdmin && (
                  <TableCell>
                    <span className="text-sm">{mapping.tenantId}</span>
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono font-semibold">{mapping.did}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {mapping.menu ? (
                    <div>
                      <p className="font-medium">{mapping.menu.name}</p>
                      {mapping.menu.description && (
                        <p className="text-xs text-muted-foreground">{mapping.menu.description}</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Menu #{mapping.menuId}</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={mapping.isActive ? 'default' : 'secondary'}>
                    {mapping.isActive ? 'Actif' : 'Inactif'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {new Date(mapping.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </TableCell>
                {canModify && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleEditClick(mapping)}
                        disabled={isAdding || editingId !== null}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleDeleteClick(mapping)}
                        disabled={isAdding || editingId !== null}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce mapping DID ?
              {mappingToDelete && (
                <div className="mt-4 p-3 bg-muted rounded-lg space-y-1">
                  <p className="font-semibold">
                    DID: <span className="font-mono">{mappingToDelete.did}</span>
                  </p>
                  {mappingToDelete.menu && (
                    <p className="text-sm">
                      Menu: {mappingToDelete.menu.name}
                    </p>
                  )}
                </div>
              )}
              <p className="mt-4 text-destructive font-semibold">
                Cette action est irréversible.
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
    </div>
  );
}
