import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ChevronDown } from 'lucide-react';

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
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/components/ui/use-toast';

import contextsService, {
  type TenantContext,
  type CreateContextDto,
  type UpdateContextDto,
  DEFAULT_DIALPLAN_CONFIG,
} from '@/api/contexts';
import useAuthStore from '@/store/authStore';
import { useQuery } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';

interface ContextFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context?: TenantContext | null;
  onSuccess?: () => void;
}

// Zod validation schema
const contextSchema = z.object({
  name: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères')
    .regex(/^[a-z0-9_]+$/, 'Le nom ne peut contenir que des lettres minuscules, chiffres et underscores'),
  description: z.string().optional(),
  allowInbound: z.boolean(),
  allowOutbound: z.boolean(),
  allowInternal: z.boolean(),
  allowInterContext: z.boolean(),
  allowedContexts: z.array(z.string()).optional(),
});

type ContextFormData = z.infer<typeof contextSchema>;

export default function ContextFormModal({
  open,
  onOpenChange,
  context,
  onSuccess,
}: ContextFormModalProps) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialplanOpen, setDialplanOpen] = useState(false);

  const isEditMode = !!context;

  // Fetch all available contexts for multi-select
  const { data: allContexts = [] } = useQuery({
    queryKey: ['contexts', 'all'],
    queryFn: () => contextsService.getAll(),
    enabled: open, // Only fetch when modal is open
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ContextFormData>({
    resolver: zodResolver(contextSchema),
    defaultValues: {
      name: '',
      description: '',
      allowInbound: DEFAULT_DIALPLAN_CONFIG.allowInbound,
      allowOutbound: DEFAULT_DIALPLAN_CONFIG.allowOutbound,
      allowInternal: DEFAULT_DIALPLAN_CONFIG.allowInternal,
      allowInterContext: DEFAULT_DIALPLAN_CONFIG.allowInterContext,
      allowedContexts: [],
    },
  });

  // Load context data in edit mode
  useEffect(() => {
    if (context) {
      const displayName = contextsService.getDisplayName(context);
      setValue('name', displayName);
      setValue('description', context.description || '');
      setValue('allowInbound', context.dialplanConfig?.allowInbound ?? true);
      setValue('allowOutbound', context.dialplanConfig?.allowOutbound ?? true);
      setValue('allowInternal', context.dialplanConfig?.allowInternal ?? true);
      setValue('allowInterContext', context.dialplanConfig?.allowInterContext ?? false);
      setValue('allowedContexts', context.dialplanConfig?.allowedContexts || []);
    }
  }, [context, setValue]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      reset();
      setDialplanOpen(false);
    }
  }, [open, reset]);

  // Watch name field for preview
  const nameValue = watch('name');

  // Generate preview
  const contextPreview = user?.tenantId
    ? contextsService.generateContextPreview(user.tenantId, nameValue)
    : '';

  // Handle form submission
  const onSubmit = async (data: ContextFormData) => {
    setIsSubmitting(true);

    try {
      if (isEditMode && context) {
        // Update context
        const updateData: UpdateContextDto = {
          description: data.description || undefined,
          dialplanConfig: {
            allowInbound: data.allowInbound,
            allowOutbound: data.allowOutbound,
            allowInternal: data.allowInternal,
            allowInterContext: data.allowInterContext,
            allowedContexts: data.allowInterContext ? (data.allowedContexts || []) : [],
          },
        };

        await contextsService.update(context.id, updateData);

        toast({
          title: 'Contexte mis à jour',
          description: `Le contexte "${context.name}" a été mis à jour avec succès.`,
        });
      } else {
        // Create new context
        const createData: CreateContextDto = {
          name: data.name,
          description: data.description || undefined,
          dialplanConfig: {
            allowInbound: data.allowInbound,
            allowOutbound: data.allowOutbound,
            allowInternal: data.allowInternal,
            allowInterContext: data.allowInterContext,
            allowedContexts: data.allowInterContext ? (data.allowedContexts || []) : [],
          },
        };

        await contextsService.create(createData);

        toast({
          title: 'Contexte créé',
          description: `Le contexte "${contextPreview}" a été créé avec succès.`,
        });
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving context:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description:
          error.response?.data?.error?.message ||
          error.response?.data?.message ||
          `Une erreur est survenue lors de ${isEditMode ? 'la mise à jour' : 'la création'} du contexte.`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Modifier le contexte' : 'Créer un nouveau contexte'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Modifiez la description et la configuration du dialplan.'
              : 'Créez un nouveau contexte pour organiser vos appels et extensions.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informations de base</h3>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Nom du contexte <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="sales, support, technical..."
                disabled={isEditMode || isSubmitting}
                className={isEditMode ? 'bg-muted' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
              {!isEditMode && contextPreview && (
                <p className="text-xs text-muted-foreground">
                  Nom complet : <span className="font-mono font-semibold">{contextPreview}</span>
                </p>
              )}
              {isEditMode && (
                <p className="text-xs text-muted-foreground">
                  Le nom du contexte ne peut pas être modifié après création.
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Description du contexte (optionnel)"
                disabled={isSubmitting}
                rows={3}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>
          </div>

          {/* Dialplan Configuration */}
          <Collapsible open={dialplanOpen} onOpenChange={setDialplanOpen}>
            <div className="space-y-4">
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                  disabled={isSubmitting}
                >
                  <span className="font-semibold">Configuration du Dialplan</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      dialplanOpen ? 'rotate-180' : ''
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  Configurez les permissions d'appel pour ce contexte.
                </p>

                {/* Allow Inbound */}
                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="allowInbound">Appels entrants</Label>
                    <p className="text-xs text-muted-foreground">
                      Autoriser les appels entrants vers ce contexte
                    </p>
                  </div>
                  <Switch
                    id="allowInbound"
                    checked={watch('allowInbound')}
                    onCheckedChange={(checked) => setValue('allowInbound', checked)}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Allow Outbound */}
                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="allowOutbound">Appels sortants</Label>
                    <p className="text-xs text-muted-foreground">
                      Autoriser les appels sortants depuis ce contexte
                    </p>
                  </div>
                  <Switch
                    id="allowOutbound"
                    checked={watch('allowOutbound')}
                    onCheckedChange={(checked) => setValue('allowOutbound', checked)}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Allow Internal */}
                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="allowInternal">Appels internes</Label>
                    <p className="text-xs text-muted-foreground">
                      Autoriser les appels entre extensions du même contexte
                    </p>
                  </div>
                  <Switch
                    id="allowInternal"
                    checked={watch('allowInternal')}
                    onCheckedChange={(checked) => setValue('allowInternal', checked)}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Allow Inter-Context */}
                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="allowInterContext">Appels inter-contextes</Label>
                    <p className="text-xs text-muted-foreground">
                      Autoriser les appels vers d'autres contextes du tenant
                    </p>
                  </div>
                  <Switch
                    id="allowInterContext"
                    checked={watch('allowInterContext')}
                    onCheckedChange={(checked) => {
                      setValue('allowInterContext', checked);
                      // Reset allowed contexts when disabling inter-context
                      if (!checked) {
                        setValue('allowedContexts', []);
                      }
                    }}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Allowed Contexts Multi-Select (shown only when allowInterContext is true) */}
                {watch('allowInterContext') && (
                  <div className="space-y-3 pt-4 border-t">
                    <Label>Contextes autorisés</Label>
                    <p className="text-xs text-muted-foreground">
                      Sélectionnez les contextes que ce contexte peut appeler
                    </p>

                    <div className="rounded-md border p-4 max-h-64 overflow-y-auto space-y-3">
                      {allContexts
                        .filter((ctx) => ctx.id !== context?.id) // Exclude current context
                        .map((ctx) => {
                          const isChecked = (watch('allowedContexts') || []).includes(ctx.name);

                          return (
                            <div key={ctx.id} className="flex items-start space-x-3">
                              <Checkbox
                                id={`context-${ctx.id}`}
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  const current = watch('allowedContexts') || [];
                                  if (checked) {
                                    setValue('allowedContexts', [...current, ctx.name]);
                                  } else {
                                    setValue('allowedContexts', current.filter((name) => name !== ctx.name));
                                  }
                                }}
                                disabled={isSubmitting}
                              />
                              <div className="flex-1 space-y-1">
                                <Label
                                  htmlFor={`context-${ctx.id}`}
                                  className="text-sm font-medium leading-none cursor-pointer"
                                >
                                  {ctx.name}
                                  {ctx.isPrimary && (
                                    <span className="ml-2 text-xs text-green-600 font-normal">
                                      (Principal)
                                    </span>
                                  )}
                                </Label>
                                {ctx.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {ctx.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}

                      {allContexts.filter((ctx) => ctx.id !== context?.id).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Aucun autre contexte disponible
                        </p>
                      )}
                    </div>

                    {/* Counter */}
                    <p className="text-xs text-muted-foreground">
                      {(watch('allowedContexts') || []).length} contexte(s) sélectionné(s)
                    </p>
                  </div>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>

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
