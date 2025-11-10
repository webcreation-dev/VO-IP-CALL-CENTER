import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Info, FileAudio } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';

import ivrService, {
  type IvrMenu,
  type CreateIvrMenuDto,
  type UpdateIvrMenuDto,
} from '@/api/ivr';
import tenantsService from '@/api/tenants';
import useAuthStore from '@/store/authStore';
import { UserRole } from '@/api/auth';

interface IvrMenuFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menu?: IvrMenu | null;
  onSuccess?: () => void;
}

// Zod validation schema
const ivrMenuSchema = z.object({
  tenantId: z.number().min(1, 'Sélectionnez un tenant').optional(),
  name: z
    .string()
    .min(3, 'Le nom doit contenir au moins 3 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .regex(/^[a-z0-9_-]+$/, 'Le nom ne peut contenir que des lettres minuscules, chiffres, tirets et underscores'),
  description: z.string().max(255).optional(),
  welcomeMessage: z.string().max(255).optional(),
  invalidMessage: z.string().max(255).optional(),
  timeoutMessage: z.string().max(255).optional(),
  timeout: z.number().min(1).max(60),
  maxRetries: z.number().min(0).max(10),
  isActive: z.boolean(),
});

type IvrMenuFormData = z.infer<typeof ivrMenuSchema>;

export default function IvrMenuFormModal({
  open,
  onOpenChange,
  menu,
  onSuccess,
}: IvrMenuFormModalProps) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  const isEditMode = !!menu;
  const isAdmin = user?.role === UserRole.ADMIN;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<IvrMenuFormData>({
    resolver: zodResolver(ivrMenuSchema),
    defaultValues: {
      tenantId: user?.tenantId,
      name: '',
      description: '',
      welcomeMessage: '',
      invalidMessage: '',
      timeoutMessage: '',
      timeout: 10,
      maxRetries: 3,
      isActive: true,
    },
  });

  // Load tenants for ADMIN
  const { data: tenants } = useQuery({
    queryKey: ['tenants', 'active'],
    queryFn: () => tenantsService.getAll({ isActive: true, limit: 100 }),
    enabled: isAdmin && !isEditMode,
    staleTime: 5 * 60 * 1000,
  });

  // Load audio files
  const { data: audioFiles } = useQuery({
    queryKey: ['ivr', 'audio'],
    queryFn: () => ivrService.getAllAudioFiles(),
    staleTime: 2 * 60 * 1000,
  });

  // Load menu data in edit mode
  useEffect(() => {
    if (menu) {
      setValue('name', menu.name);
      setValue('description', menu.description || '');
      setValue('welcomeMessage', menu.welcomeMessage || '');
      setValue('invalidMessage', menu.invalidMessage || '');
      setValue('timeoutMessage', menu.timeoutMessage || '');
      setValue('timeout', menu.timeout);
      setValue('maxRetries', menu.maxRetries);
      setValue('isActive', menu.isActive);
    }
  }, [menu, setValue]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      reset();
      setActiveTab('basic');
    }
  }, [open, reset]);

  // Watch values for preview
  const nameValue = watch('name');
  const isActiveValue = watch('isActive');

  // Handle form submission
  const onSubmit = async (data: IvrMenuFormData) => {
    setIsSubmitting(true);

    try {
      if (isEditMode && menu) {
        // Update menu
        const updateData: UpdateIvrMenuDto = {
          name: data.name,
          description: data.description || undefined,
          welcomeMessage: data.welcomeMessage || undefined,
          invalidMessage: data.invalidMessage || undefined,
          timeoutMessage: data.timeoutMessage || undefined,
          timeout: Number(data.timeout),
          maxRetries: Number(data.maxRetries),
          isActive: data.isActive,
        };

        await ivrService.updateMenu(menu.id, updateData);

        toast({
          title: 'Menu IVR mis à jour',
          description: `Le menu "${menu.name}" a été mis à jour avec succès.`,
        });
      } else {
        // Create new menu
        const createData: CreateIvrMenuDto = {
          tenantId: data.tenantId,
          name: data.name,
          description: data.description || undefined,
          welcomeMessage: data.welcomeMessage || undefined,
          invalidMessage: data.invalidMessage || undefined,
          timeoutMessage: data.timeoutMessage || undefined,
          timeout: Number(data.timeout),
          maxRetries: Number(data.maxRetries),
          isActive: data.isActive,
        };

        await ivrService.createMenu(createData);

        toast({
          title: 'Menu IVR créé',
          description: `Le menu "${data.name}" a été créé avec succès.`,
        });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving IVR menu:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description:
          error.response?.data?.error?.message ||
          error.response?.data?.message ||
          `Une erreur est survenue lors de ${isEditMode ? 'la mise à jour' : 'la création'} du menu IVR.`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Modifier le menu IVR' : 'Créer un nouveau menu IVR'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Modifiez la configuration du menu IVR.'
              : 'Créez un nouveau menu IVR pour gérer les appels entrants.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Informations</TabsTrigger>
              <TabsTrigger value="audio">Messages audio</TabsTrigger>
              <TabsTrigger value="settings">Paramètres</TabsTrigger>
            </TabsList>

            {/* Tab 1: Basic Information */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              {/* Tenant Selection - ADMIN only */}
              {isAdmin && !isEditMode && (
                <div className="space-y-2">
                  <Label htmlFor="tenantId">
                    Tenant <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={watch('tenantId')?.toString()}
                    onValueChange={(value) => setValue('tenantId', parseInt(value))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants?.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id.toString()}>
                          {tenant.name} {tenant.companyName && `- ${tenant.companyName}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.tenantId && (
                    <p className="text-sm text-destructive">{errors.tenantId.message}</p>
                  )}
                </div>
              )}

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nom du menu <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="main_menu, support_ivr..."
                  disabled={isEditMode || isSubmitting}
                  className={isEditMode ? 'bg-muted' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
                {isEditMode && (
                  <p className="text-xs text-muted-foreground">
                    Le nom du menu ne peut pas être modifié après création.
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Description du menu IVR (optionnel)"
                  disabled={isSubmitting}
                  rows={3}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>

              {/* Active Status */}
              <div className="flex items-center justify-between space-y-2 p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive">Menu actif</Label>
                  <p className="text-sm text-muted-foreground">
                    Désactiver le menu empêchera son utilisation
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={isActiveValue}
                  onCheckedChange={(checked) => setValue('isActive', checked)}
                  disabled={isSubmitting}
                />
              </div>
            </TabsContent>

            {/* Tab 2: Audio Messages */}
            <TabsContent value="audio" className="space-y-4 mt-4">
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  Les messages audio peuvent être des fichiers uploadés ou des noms de fichiers Asterisk
                  (ex: "welcome", "invalid", "timeout").
                </div>
              </div>

              {/* Welcome Message */}
              <div className="space-y-2">
                <Label htmlFor="welcomeMessage">
                  <FileAudio className="inline h-4 w-4 mr-1" />
                  Message de bienvenue
                </Label>
                <Input
                  id="welcomeMessage"
                  {...register('welcomeMessage')}
                  placeholder="welcome, main-menu..."
                  disabled={isSubmitting}
                  list="audio-suggestions"
                />
                <datalist id="audio-suggestions">
                  {audioFiles?.map((audio) => (
                    <option key={audio.id} value={audio.name} />
                  ))}
                </datalist>
                {errors.welcomeMessage && (
                  <p className="text-sm text-destructive">{errors.welcomeMessage.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Message joué à l'entrée du menu
                </p>
              </div>

              {/* Invalid Message */}
              <div className="space-y-2">
                <Label htmlFor="invalidMessage">
                  <FileAudio className="inline h-4 w-4 mr-1" />
                  Message choix invalide
                </Label>
                <Input
                  id="invalidMessage"
                  {...register('invalidMessage')}
                  placeholder="invalid, option-invalide..."
                  disabled={isSubmitting}
                  list="audio-suggestions"
                />
                {errors.invalidMessage && (
                  <p className="text-sm text-destructive">{errors.invalidMessage.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Message joué quand l'utilisateur fait un choix invalide
                </p>
              </div>

              {/* Timeout Message */}
              <div className="space-y-2">
                <Label htmlFor="timeoutMessage">
                  <FileAudio className="inline h-4 w-4 mr-1" />
                  Message timeout
                </Label>
                <Input
                  id="timeoutMessage"
                  {...register('timeoutMessage')}
                  placeholder="timeout, temps-ecoule..."
                  disabled={isSubmitting}
                  list="audio-suggestions"
                />
                {errors.timeoutMessage && (
                  <p className="text-sm text-destructive">{errors.timeoutMessage.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Message joué quand l'utilisateur ne fait aucun choix
                </p>
              </div>

              {audioFiles && audioFiles.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Fichiers audio disponibles :</p>
                  <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                    {audioFiles.map((audio) => (
                      <div
                        key={audio.id}
                        className="text-xs p-2 hover:bg-muted rounded cursor-pointer"
                        onClick={() => {
                          // Copy to clipboard or insert
                          navigator.clipboard.writeText(audio.name);
                          toast({
                            title: 'Copié',
                            description: `"${audio.name}" copié dans le presse-papier`,
                          });
                        }}
                      >
                        <span className="font-mono font-semibold">{audio.name}</span>
                        {audio.description && (
                          <span className="text-muted-foreground ml-2">- {audio.description}</span>
                        )}
                        <span className="text-muted-foreground ml-2">
                          ({ivrService.formatDuration(audio.duration)})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Tab 3: Settings */}
            <TabsContent value="settings" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Timeout */}
                <div className="space-y-2">
                  <Label htmlFor="timeout">
                    Timeout (secondes) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="timeout"
                    type="number"
                    {...register('timeout', { valueAsNumber: true })}
                    placeholder="10"
                    disabled={isSubmitting}
                    min="1"
                    max="60"
                  />
                  {errors.timeout && (
                    <p className="text-sm text-destructive">{errors.timeout.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Temps d'attente avant timeout (1-60s)
                  </p>
                </div>

                {/* Max Retries */}
                <div className="space-y-2">
                  <Label htmlFor="maxRetries">
                    Tentatives max <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="maxRetries"
                    type="number"
                    {...register('maxRetries', { valueAsNumber: true })}
                    placeholder="3"
                    disabled={isSubmitting}
                    min="0"
                    max="10"
                  />
                  {errors.maxRetries && (
                    <p className="text-sm text-destructive">{errors.maxRetries.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Nombre de tentatives avant abandon (0-10)
                  </p>
                </div>
              </div>

              {/* Configuration Preview */}
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  <Label className="text-sm font-semibold">Aperçu de la configuration :</Label>
                </div>
                <div className="space-y-1 text-sm font-mono">
                  <p>Menu: <span className="text-primary font-semibold">{nameValue || '(nom)'}</span></p>
                  <p>Statut: <span className={isActiveValue ? 'text-green-600' : 'text-red-600'}>
                    {isActiveValue ? 'Actif' : 'Inactif'}
                  </span></p>
                  <p>Timeout: {watch('timeout')}s</p>
                  <p>Tentatives max: {watch('maxRetries')}</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Form Actions */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
