import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ChevronDown, Info, Shuffle } from 'lucide-react';

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
  type CustomRole,
  type RolePreset,
  DEFAULT_DIALPLAN_CONFIG,
} from '@/api/contexts';
import useAuthStore from '@/store/authStore';
import { useQuery } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import RoleStrategyCard from './RoleStrategyCard';
import RolePresetCard from './RolePresetCard';
import CustomizePresetModal from './CustomizePresetModal';

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
  // Role configuration
  roleStrategy: z.enum(['use-tenant-roles', 'context-specific']).optional(),
  presetId: z.string().optional(),
  // Dialplan configuration
  allowInbound: z.boolean(),
  allowOutbound: z.boolean(),
  allowInternal: z.boolean(),
  allowInterContext: z.boolean(),
  allowedContexts: z.array(z.string()).optional(),
}).refine(
  (data) => {
    // If context-specific is selected, presetId is required
    if (data.roleStrategy === 'context-specific' && !data.presetId) {
      return false;
    }
    return true;
  },
  {
    message: 'Un preset est requis pour les rôles context-specific',
    path: ['presetId'],
  }
);

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
  const [roleConfigOpen, setRoleConfigOpen] = useState(false);
  const [expandedPreset, setExpandedPreset] = useState<string | null>(null);
  const [customRoles, setCustomRoles] = useState<CustomRole[] | undefined>(undefined);
  const [customizeModalOpen, setCustomizeModalOpen] = useState(false);
  const [selectedPresetForCustomize, setSelectedPresetForCustomize] = useState<RolePreset | null>(null);

  const isEditMode = !!context;

  // Fetch all available contexts for multi-select
  const { data: allContexts = [] } = useQuery({
    queryKey: ['contexts', 'all'],
    queryFn: () => contextsService.getAll(),
    enabled: open, // Only fetch when modal is open
  });

  // Fetch role presets (only in create mode)
  const { data: rolePresets = [], isLoading: presetsLoading } = useQuery({
    queryKey: ['role-presets'],
    queryFn: () => contextsService.getRolePresets(),
    enabled: open && !isEditMode,
    staleTime: 10 * 60 * 1000, // 10 minutes
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
      roleStrategy: 'use-tenant-roles',
      presetId: undefined,
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
      setRoleConfigOpen(false);
      setExpandedPreset(null);
      setCustomRoles(undefined);
      setSelectedPresetForCustomize(null);
    }
  }, [open, reset]);

  // Watch name field for preview
  const nameValue = watch('name');
  const presetIdValue = watch('presetId');

  // Generate preview
  const contextPreview = user?.tenantId
    ? contextsService.generateContextPreview(user.tenantId, nameValue)
    : '';

  // Handle customize button click
  const handleCustomizeClick = () => {
    const preset = rolePresets.find((p) => p.id === presetIdValue);
    if (preset) {
      setSelectedPresetForCustomize(preset);
      setCustomizeModalOpen(true);
    }
  };

  // Handle apply custom roles
  const handleApplyCustomRoles = (roles: CustomRole[]) => {
    setCustomRoles(roles);
  };

  // Handle reset customization
  const handleResetCustomization = () => {
    setCustomRoles(undefined);
  };

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
          roleStrategy: data.roleStrategy,
          presetId: data.presetId,
          customRoles: customRoles, // Include custom roles if defined
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

          {/* Role Configuration (only in create mode) */}
          {!isEditMode && (
            <Collapsible open={roleConfigOpen} onOpenChange={setRoleConfigOpen}>
              <div className="space-y-4">
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                    disabled={isSubmitting}
                  >
                    <span className="font-semibold">Configuration des Rôles</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        roleConfigOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Définissez comment les rôles hiérarchiques seront gérés pour ce contexte.
                  </p>

                  {/* Role Strategy Selection */}
                  <div className="space-y-3">
                    <Label>Stratégie de rôles</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <RoleStrategyCard
                        type="use-tenant-roles"
                        selected={watch('roleStrategy') === 'use-tenant-roles'}
                        onSelect={() => {
                          setValue('roleStrategy', 'use-tenant-roles');
                          setValue('presetId', undefined);
                        }}
                        tenantRolesCount={0} // TODO: fetch actual count if needed
                      />
                      <RoleStrategyCard
                        type="context-specific"
                        selected={watch('roleStrategy') === 'context-specific'}
                        onSelect={() => setValue('roleStrategy', 'context-specific')}
                      />
                    </div>
                  </div>

                  {/* Role Preset Selection (shown only when context-specific is selected) */}
                  {watch('roleStrategy') === 'context-specific' && (
                    <div className="space-y-3 pt-4 border-t">
                      <Label>
                        Sélectionner un preset <span className="text-destructive">*</span>
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Choisissez un modèle de hiérarchie de rôles prédéfini.
                      </p>

                      {presetsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          <span className="ml-2 text-sm text-muted-foreground">
                            Chargement des presets...
                          </span>
                        </div>
                      ) : rolePresets.length === 0 ? (
                        <Card className="border-dashed">
                          <CardContent className="pt-6 text-center">
                            <Info className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              Aucun preset disponible
                            </p>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="space-y-3">
                          {rolePresets.map((preset) => (
                            <RolePresetCard
                              key={preset.id}
                              preset={preset}
                              selected={watch('presetId') === preset.id}
                              onSelect={() => setValue('presetId', preset.id)}
                              expanded={expandedPreset === preset.id}
                              onToggleExpand={() =>
                                setExpandedPreset(
                                  expandedPreset === preset.id ? null : preset.id
                                )
                              }
                            />
                          ))}
                        </div>
                      )}

                      {errors.presetId && (
                        <p className="text-sm text-destructive">{errors.presetId.message}</p>
                      )}

                      {/* Customize Button (shown only when a preset is selected) */}
                      {presetIdValue && (
                        <div className="pt-3 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1">
                              <Label className="text-xs font-semibold">Personnalisation</Label>
                              <p className="text-xs text-muted-foreground mt-1">
                                {customRoles
                                  ? 'Ce preset a été personnalisé. Les modifications ne seront appliquées qu\'à ce contexte.'
                                  : 'Personnalisez les rôles et permissions avant application.'}
                              </p>
                            </div>
                            {customRoles && (
                              <Badge variant="secondary" className="bg-purple-100 text-purple-700 shrink-0">
                                Personnalisé
                              </Badge>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleCustomizeClick}
                              className="flex-1"
                            >
                              <Shuffle className="h-4 w-4 mr-2" />
                              {customRoles ? 'Modifier la personnalisation' : 'Personnaliser le preset'}
                            </Button>

                            {customRoles && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleResetCustomization}
                              >
                                Réinitialiser
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}

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

        {/* Customize Preset Modal */}
        <CustomizePresetModal
          open={customizeModalOpen}
          onOpenChange={setCustomizeModalOpen}
          preset={selectedPresetForCustomize}
          initialCustomRoles={customRoles}
          onApply={handleApplyCustomRoles}
        />
      </DialogContent>
    </Dialog>
  );
}
