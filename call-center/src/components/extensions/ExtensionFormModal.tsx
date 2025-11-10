import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Info } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

import extensionsService, {
  type Extension,
  type CreateExtensionDto,
  type UpdateExtensionDto,
  ASTERISK_APPS,
  EXTENSION_PATTERNS,
} from '@/api/extensions';
import contextsService from '@/api/contexts';
import tenantsService from '@/api/tenants';
import useAuthStore from '@/store/authStore';
import { UserRole } from '@/api/auth';

interface ExtensionFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extension?: Extension | null;
  onSuccess?: () => void;
}

// Zod validation schema
const extensionSchema = z.object({
  tenantId: z.number().min(1, 'Sélectionnez un tenant').optional(),
  context: z
    .string()
    .min(1, 'Le contexte est requis')
    .max(40, 'Le contexte ne peut pas dépasser 40 caractères'),
  exten: z
    .string()
    .min(1, 'Le pattern est requis')
    .regex(/^(_?[0-9XNZ.\[\]\-sith!]+)$/, 'Pattern Asterisk invalide'),
  priority: z.number().min(1).optional(),
  app: z.string().min(1, 'L\'application est requise'),
  appdata: z.string(),
});

type ExtensionFormData = z.infer<typeof extensionSchema>;

export default function ExtensionFormModal({
  open,
  onOpenChange,
  extension,
  onSuccess,
}: ExtensionFormModalProps) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!extension;
  const isAdmin = user?.role === UserRole.ADMIN;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ExtensionFormData>({
    resolver: zodResolver(extensionSchema),
    defaultValues: {
      tenantId: user?.tenantId,
      context: '',
      exten: '',
      priority: undefined,
      app: '',
      appdata: '',
    },
  });

  // Load tenants for ADMIN
  const { data: tenants } = useQuery({
    queryKey: ['tenants', 'active'],
    queryFn: () => tenantsService.getAll({ isActive: true, limit: 100 }),
    enabled: isAdmin && !isEditMode,
    staleTime: 5 * 60 * 1000,
  });

  // Load contexts
  const { data: contexts } = useQuery({
    queryKey: ['contexts'],
    queryFn: () => contextsService.getAll(),
    staleTime: 2 * 60 * 1000,
  });

  // Load extension data in edit mode
  useEffect(() => {
    if (extension) {
      setValue('context', extension.context);
      setValue('exten', extension.exten);
      setValue('priority', extension.priority);
      setValue('app', extension.app);
      setValue('appdata', extension.appdata);
    }
  }, [extension, setValue]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  // Watch app to show example
  const selectedApp = watch('app');
  const selectedPattern = watch('exten');
  const selectedContext = watch('context');
  const selectedPriority = watch('priority');

  // Get app example
  const appExample = selectedApp ? extensionsService.getAppExample(selectedApp) : '';

  // Generate dialplan preview
  const dialplanPreview = selectedContext && selectedPattern && selectedPriority && selectedApp
    ? `exten => ${selectedPattern},${selectedPriority},${selectedApp}(${watch('appdata') || ''})`
    : '';

  // Handle form submission
  const onSubmit = async (data: ExtensionFormData) => {
    setIsSubmitting(true);

    try {
      if (isEditMode && extension) {
        // Update extension
        const updateData: UpdateExtensionDto = {
          context: data.context,
          exten: data.exten,
          priority: data.priority ? Number(data.priority) : undefined,
          app: data.app,
          appdata: data.appdata,
        };

        await extensionsService.update(extension.id, updateData);

        toast({
          title: 'Extension mise à jour',
          description: `L'extension a été mise à jour avec succès.`,
        });
      } else {
        // Create new extension
        const createData: CreateExtensionDto = {
          tenantId: data.tenantId,
          context: data.context,
          exten: data.exten,
          priority: data.priority ? Number(data.priority) : undefined,
          app: data.app,
          appdata: data.appdata,
        };

        await extensionsService.create(createData);

        toast({
          title: 'Extension créée',
          description: `L'extension a été créée avec succès.`,
        });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving extension:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description:
          error.response?.data?.error?.message ||
          error.response?.data?.message ||
          `Une erreur est survenue lors de ${isEditMode ? 'la mise à jour' : 'la création'} de l'extension.`,
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
            {isEditMode ? 'Modifier l\'extension' : 'Créer une nouvelle extension'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Modifiez les paramètres de l\'extension dialplan.'
              : 'Créez une nouvelle entrée dans le dialplan Asterisk.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

          {/* Context */}
          <div className="space-y-2">
            <Label htmlFor="context">
              Contexte <span className="text-destructive">*</span>
            </Label>
            <Select
              value={watch('context')}
              onValueChange={(value) => setValue('context', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un contexte" />
              </SelectTrigger>
              <SelectContent>
                {contexts?.map((ctx) => (
                  <SelectItem key={ctx.id} value={ctx.name}>
                    {contextsService.getDisplayName(ctx)} ({ctx.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.context && (
              <p className="text-sm text-destructive">{errors.context.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Le contexte dialplan où cette extension sera active
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Extension Pattern */}
            <div className="space-y-2">
              <Label htmlFor="exten">
                Extension / Pattern <span className="text-destructive">*</span>
              </Label>
              <Input
                id="exten"
                {...register('exten')}
                placeholder="_1XXX, 999, s..."
                disabled={isSubmitting}
                list="pattern-suggestions"
              />
              <datalist id="pattern-suggestions">
                {EXTENSION_PATTERNS.map((p) => (
                  <option key={p.value} value={p.value} />
                ))}
              </datalist>
              {errors.exten && (
                <p className="text-sm text-destructive">{errors.exten.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Pattern Asterisk : _1XXX, s, i, t, [2-9]XX...
              </p>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Input
                id="priority"
                type="number"
                {...register('priority', { valueAsNumber: true })}
                placeholder="Auto si vide"
                disabled={isSubmitting}
                min="1"
              />
              {errors.priority && (
                <p className="text-sm text-destructive">{errors.priority.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Ordre d'exécution (auto-calculé si non spécifié)
              </p>
            </div>
          </div>

          {/* Application */}
          <div className="space-y-2">
            <Label htmlFor="app">
              Application <span className="text-destructive">*</span>
            </Label>
            <Select
              value={watch('app')}
              onValueChange={(value) => {
                setValue('app', value);
                // Set example as default appdata
                const example = extensionsService.getAppExample(value);
                if (example && !watch('appdata')) {
                  setValue('appdata', example);
                }
              }}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une application" />
              </SelectTrigger>
              <SelectContent>
                {ASTERISK_APPS.map((app) => (
                  <SelectItem key={app.value} value={app.value}>
                    {app.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.app && (
              <p className="text-sm text-destructive">{errors.app.message}</p>
            )}
          </div>

          {/* AppData */}
          <div className="space-y-2">
            <Label htmlFor="appdata">Arguments (AppData)</Label>
            <Input
              id="appdata"
              {...register('appdata')}
              placeholder={appExample || "Arguments de l'application"}
              disabled={isSubmitting}
            />
            {errors.appdata && (
              <p className="text-sm text-destructive">{errors.appdata.message}</p>
            )}
            {appExample && (
              <p className="text-xs text-muted-foreground">
                Exemple : {appExample}
              </p>
            )}
          </div>

          {/* Dialplan Preview */}
          {dialplanPreview && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600" />
                <Label className="text-sm font-semibold">Prévisualisation dialplan :</Label>
              </div>
              <code className="text-sm font-mono block">
                {dialplanPreview}
              </code>
            </div>
          )}

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
