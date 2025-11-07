import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit, Trash2, Save, X, Phone, Users, Menu as MenuIcon, PhoneOff, Voicemail, PhoneCall, Settings } from 'lucide-react';

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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

import ivrService, {
  type IvrOption,
  type CreateIvrOptionDto,
  type UpdateIvrOptionDto,
  IvrOptionActionType,
  IVR_ACTION_TYPES,
  IVR_DIGITS,
} from '@/api/ivr';

interface IvrOptionsManagerProps {
  menuId: number;
  options: IvrOption[];
  onRefresh: () => void;
}

// Zod validation schema for option form
const optionSchema = z.object({
  digit: z.string().regex(/^[0-9*#it]$/, 'Touche invalide'),
  description: z.string().max(255).optional(),
  actionType: z.nativeEnum(IvrOptionActionType),
  actionValue: z.string().max(255).optional(),
  priority: z.number().min(1).optional(),
});

type OptionFormData = z.infer<typeof optionSchema>;

export default function IvrOptionsManager({
  menuId,
  options,
  onRefresh,
}: IvrOptionsManagerProps) {
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [optionToDelete, setOptionToDelete] = useState<IvrOption | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<OptionFormData>({
    resolver: zodResolver(optionSchema),
    defaultValues: {
      digit: '',
      description: '',
      actionType: IvrOptionActionType.HANGUP,
      actionValue: '',
      priority: undefined,
    },
  });

  // Watch actionType to show/hide actionValue field
  const selectedActionType = watch('actionType');

  // Determine if actionValue is required based on actionType
  const needsActionValue = (actionType: IvrOptionActionType): boolean => {
    return ![IvrOptionActionType.HANGUP].includes(actionType);
  };

  // Get icon for action type
  const getActionIcon = (actionType: IvrOptionActionType) => {
    switch (actionType) {
      case IvrOptionActionType.GOTO_MENU:
        return MenuIcon;
      case IvrOptionActionType.GOTO_QUEUE:
        return Users;
      case IvrOptionActionType.GOTO_EXTENSION:
        return Phone;
      case IvrOptionActionType.HANGUP:
        return PhoneOff;
      case IvrOptionActionType.VOICEMAIL:
        return Voicemail;
      case IvrOptionActionType.CALLBACK:
        return PhoneCall;
      default:
        return Settings;
    }
  };

  // Handle add option
  const handleAddClick = () => {
    setIsAdding(true);
    setEditingId(null);
    reset({
      digit: '',
      description: '',
      actionType: IvrOptionActionType.HANGUP,
      actionValue: '',
      priority: undefined,
    });
  };

  // Handle edit option
  const handleEditClick = (option: IvrOption) => {
    setEditingId(option.id);
    setIsAdding(false);
    reset({
      digit: option.digit,
      description: option.description || '',
      actionType: option.actionType,
      actionValue: option.actionValue || '',
      priority: option.priority,
    });
  };

  // Handle cancel
  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    reset();
  };

  // Handle form submit
  const onSubmit = async (data: OptionFormData) => {
    try {
      if (editingId) {
        // Update existing option
        const updateData: UpdateIvrOptionDto = {
          digit: data.digit,
          description: data.description || undefined,
          actionType: data.actionType,
          actionValue: data.actionValue || undefined,
          priority: data.priority ? Number(data.priority) : undefined,
        };

        await ivrService.updateOption(editingId, updateData);

        toast({
          title: 'Option mise à jour',
          description: `L'option "${data.digit}" a été mise à jour avec succès.`,
        });
      } else {
        // Create new option
        const createData: CreateIvrOptionDto = {
          menuId,
          digit: data.digit,
          description: data.description || undefined,
          actionType: data.actionType,
          actionValue: data.actionValue || undefined,
          priority: data.priority ? Number(data.priority) : undefined,
        };

        await ivrService.createOption(createData);

        toast({
          title: 'Option créée',
          description: `L'option "${data.digit}" a été créée avec succès.`,
        });
      }

      handleCancel();
      onRefresh();
    } catch (error: any) {
      console.error('Error saving option:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description:
          error.response?.data?.error?.message ||
          error.response?.data?.message ||
          `Une erreur est survenue lors de ${editingId ? 'la mise à jour' : 'la création'} de l'option.`,
      });
    }
  };

  // Handle delete confirmation
  const handleDeleteClick = (option: IvrOption) => {
    setOptionToDelete(option);
    setDeleteDialogOpen(true);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!optionToDelete) return;

    setIsDeleting(true);

    try {
      await ivrService.deleteOption(optionToDelete.id);

      toast({
        title: 'Option supprimée',
        description: `L'option "${optionToDelete.digit}" a été supprimée avec succès.`,
      });

      setDeleteDialogOpen(false);
      setOptionToDelete(null);
      onRefresh();
    } catch (error: any) {
      console.error('Error deleting option:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description:
          error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Une erreur est survenue lors de la suppression de l\'option.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Sort options by priority
  const sortedOptions = [...options].sort((a, b) => a.priority - b.priority);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Options DTMF</h3>
        {!isAdding && !editingId && (
          <Button onClick={handleAddClick} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une option
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Touche</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-[180px]">Action</TableHead>
            <TableHead>Valeur</TableHead>
            <TableHead className="w-[80px] text-center">Priorité</TableHead>
            <TableHead className="w-[100px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Add/Edit Form Row */}
          {(isAdding || editingId) && (
            <TableRow className="bg-muted/50">
              <TableCell>
                <Select
                  value={watch('digit')}
                  onValueChange={(value) => setValue('digit', value)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Touche" />
                  </SelectTrigger>
                  <SelectContent>
                    {IVR_DIGITS.map((digit) => (
                      <SelectItem key={digit.value} value={digit.value}>
                        {digit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.digit && (
                  <p className="text-xs text-destructive mt-1">{errors.digit.message}</p>
                )}
              </TableCell>
              <TableCell>
                <Input
                  {...register('description')}
                  placeholder="Description (optionnel)"
                  className="h-8"
                />
              </TableCell>
              <TableCell>
                <Select
                  value={watch('actionType')}
                  onValueChange={(value) => setValue('actionType', value as IvrOptionActionType)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IVR_ACTION_TYPES.map((action) => (
                      <SelectItem key={action.value} value={action.value}>
                        {action.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                {needsActionValue(selectedActionType) ? (
                  <Input
                    {...register('actionValue')}
                    placeholder={
                      selectedActionType === IvrOptionActionType.GOTO_MENU
                        ? 'menu_id'
                        : selectedActionType === IvrOptionActionType.GOTO_QUEUE
                        ? 'queue_name'
                        : 'valeur'
                    }
                    className="h-8"
                  />
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  {...register('priority', { valueAsNumber: true })}
                  placeholder="Auto"
                  className="h-8"
                  min="1"
                />
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

          {/* Existing Options */}
          {sortedOptions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                Aucune option définie. Cliquez sur "Ajouter une option" pour commencer.
              </TableCell>
            </TableRow>
          ) : (
            sortedOptions.map((option) => {
              const ActionIcon = getActionIcon(option.actionType);

              return (
                <TableRow key={option.id}>
                  {/* Digit */}
                  <TableCell>
                    <Badge variant="outline" className="font-mono font-bold text-base">
                      {option.digit}
                    </Badge>
                  </TableCell>

                  {/* Description */}
                  <TableCell>
                    {option.description || (
                      <span className="text-muted-foreground italic">-</span>
                    )}
                  </TableCell>

                  {/* Action Type */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ActionIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {ivrService.getActionTypeLabel(option.actionType)}
                      </span>
                    </div>
                  </TableCell>

                  {/* Action Value */}
                  <TableCell>
                    {option.actionValue ? (
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {option.actionValue}
                      </code>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* Priority */}
                  <TableCell className="text-center">
                    <span className="font-mono text-sm text-muted-foreground">
                      {option.priority}
                    </span>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleEditClick(option)}
                        disabled={isAdding || editingId !== null}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleDeleteClick(option)}
                        disabled={isAdding || editingId !== null}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette option ?
              {optionToDelete && (
                <div className="mt-4 p-3 bg-muted rounded-lg space-y-1">
                  <p className="font-semibold">
                    Touche: <span className="font-mono">{optionToDelete.digit}</span>
                  </p>
                  <p className="text-sm">
                    Action: {ivrService.getActionTypeLabel(optionToDelete.actionType)}
                  </p>
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
