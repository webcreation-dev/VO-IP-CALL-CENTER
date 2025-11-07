import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Plus, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/components/ui/use-toast';

import tenantsService, { type Tenant, type CreateTenantDto, type UpdateTenantDto, COMMON_TIMEZONES, DEFAULT_DIALPLAN_CONFIG } from '@/api/tenants';

// Validation Schema
const tenantSchema = z.object({
  // Basic Information
  name: z.string()
    .min(3, 'Le nom doit contenir au moins 3 caractères')
    .max(255, 'Le nom ne doit pas dépasser 255 caractères'),
  companyName: z.string().max(255).optional().or(z.literal('')),
  context: z.string()
    .max(40, 'Le contexte ne doit pas dépasser 40 caractères')
    .regex(/^[a-z0-9_-]*$/, 'Le contexte ne doit contenir que des lettres minuscules, chiffres, tirets et underscores')
    .optional()
    .or(z.literal('')),

  // Contact Information
  contactEmail: z.string().email('Email invalide').optional().or(z.literal('')),
  contactPhone: z.string().max(50).optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  country: z.string().max(100).optional().or(z.literal('')),

  // Configuration
  timezone: z.string().max(50).optional().or(z.literal('')),
  maxEndpoints: z.number()
    .min(1, 'Minimum 1 endpoint')
    .max(10000, 'Maximum 10000 endpoints')
    .optional(),
  maxQueues: z.number()
    .min(1, 'Minimum 1 file d\'attente')
    .max(1000, 'Maximum 1000 files d\'attente')
    .optional(),
  isActive: z.boolean().optional(),

  // Advanced Dialplan Configuration
  internalDialPattern: z.string().optional().or(z.literal('')),
  internalDialTimeout: z.number().min(1).max(300).optional(),
  queuePattern: z.string().optional().or(z.literal('')),
  voicemailPattern: z.string().optional().or(z.literal('')),
  testExtension: z.string().optional().or(z.literal('')),
  allowExternal: z.boolean().optional(),
  externalPattern: z.string().optional().or(z.literal('')),
  externalPrefix: z.string().optional().or(z.literal('')),
});

type TenantFormData = z.infer<typeof tenantSchema>;

interface TenantFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant?: Tenant | null;
  onSuccess?: () => void;
}

export default function TenantFormModal({ open, onOpenChange, tenant, onSuccess }: TenantFormModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoGenerateContext, setAutoGenerateContext] = useState(true);

  // Collapsible sections state
  const [contactOpen, setContactOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [dialplanOpen, setDialplanOpen] = useState(false);

  const isEditMode = !!tenant;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      name: '',
      companyName: '',
      context: '',
      contactEmail: '',
      contactPhone: '',
      address: '',
      city: '',
      country: '',
      timezone: 'UTC',
      maxEndpoints: 100,
      maxQueues: 50,
      isActive: true,
      internalDialPattern: DEFAULT_DIALPLAN_CONFIG.internalDialPattern,
      internalDialTimeout: DEFAULT_DIALPLAN_CONFIG.internalDialTimeout,
      queuePattern: DEFAULT_DIALPLAN_CONFIG.queuePattern,
      voicemailPattern: DEFAULT_DIALPLAN_CONFIG.voicemailPattern,
      testExtension: DEFAULT_DIALPLAN_CONFIG.testExtension,
      allowExternal: DEFAULT_DIALPLAN_CONFIG.allowExternal,
      externalPattern: '',
      externalPrefix: '0', // Valeur par défaut pour éviter les erreurs de validation
    },
  });

  const nameValue = watch('name');
  const allowExternalValue = watch('allowExternal');

  // Auto-generate context from name
  useEffect(() => {
    if (autoGenerateContext && nameValue && !isEditMode) {
      const generatedContext = tenantsService.generateContextName(nameValue);
      setValue('context', generatedContext);
    }
  }, [nameValue, autoGenerateContext, isEditMode, setValue]);

  // Load tenant data in edit mode
  useEffect(() => {
    if (tenant && open) {
      reset({
        name: tenant.name,
        companyName: tenant.companyName || '',
        context: tenant.context || '',
        contactEmail: tenant.contactEmail || '',
        contactPhone: tenant.contactPhone || '',
        address: tenant.address || '',
        city: tenant.city || '',
        country: tenant.country || '',
        timezone: tenant.timezone || 'UTC',
        maxEndpoints: tenant.maxEndpoints || 100,
        maxQueues: tenant.maxQueues || 50,
        isActive: tenant.isActive ?? true,
        internalDialPattern: tenant.dialplanConfig?.internalDialPattern || DEFAULT_DIALPLAN_CONFIG.internalDialPattern,
        internalDialTimeout: tenant.dialplanConfig?.internalDialTimeout || DEFAULT_DIALPLAN_CONFIG.internalDialTimeout,
        queuePattern: tenant.dialplanConfig?.queuePattern || DEFAULT_DIALPLAN_CONFIG.queuePattern,
        voicemailPattern: tenant.dialplanConfig?.voicemailPattern || DEFAULT_DIALPLAN_CONFIG.voicemailPattern,
        testExtension: tenant.dialplanConfig?.testExtension || DEFAULT_DIALPLAN_CONFIG.testExtension,
        allowExternal: tenant.dialplanConfig?.allowExternal || false,
        externalPattern: tenant.dialplanConfig?.externalPattern || '',
        externalPrefix: tenant.dialplanConfig?.externalPrefix || '0',
      });
      setAutoGenerateContext(false);
    } else if (!tenant && open) {
      // Reset to defaults for create mode
      reset();
      setAutoGenerateContext(true);
    }
  }, [tenant, open, reset]);

  const onSubmit = async (data: TenantFormData) => {
    setIsSubmitting(true);

    try {
      // Build dialplan config if any field is filled
      const dialplanConfig = (
        data.internalDialPattern ||
        data.queuePattern ||
        data.voicemailPattern ||
        data.testExtension ||
        data.allowExternal
      ) ? {
        internalDialPattern: data.internalDialPattern,
        internalDialTimeout: data.internalDialTimeout,
        queuePattern: data.queuePattern,
        voicemailPattern: data.voicemailPattern,
        testExtension: data.testExtension,
        allowExternal: data.allowExternal,
        externalPattern: data.externalPattern,
        // Si externalPrefix est vide, utiliser "0" par défaut pour la validation backend
        externalPrefix: data.externalPrefix || '0',
      } : undefined;

      if (isEditMode && tenant) {
        // Update tenant
        const updateData: UpdateTenantDto = {
          name: data.name !== tenant.name ? data.name : undefined,
          companyName: data.companyName || undefined,
          context: data.context || undefined,
          contactEmail: data.contactEmail || undefined,
          contactPhone: data.contactPhone || undefined,
          address: data.address || undefined,
          city: data.city || undefined,
          country: data.country || undefined,
          timezone: data.timezone || undefined,
          maxEndpoints: data.maxEndpoints,
          maxQueues: data.maxQueues,
          isActive: data.isActive,
          dialplanConfig,
        };

        await tenantsService.update(tenant.id, updateData);

        toast({
          title: 'Tenant mis à jour',
          description: `Le tenant "${data.name}" a été mis à jour avec succès.`,
        });
      } else {
        // Create tenant
        const createData: CreateTenantDto = {
          name: data.name,
          companyName: data.companyName || undefined,
          context: data.context || undefined,
          contactEmail: data.contactEmail || undefined,
          contactPhone: data.contactPhone || undefined,
          address: data.address || undefined,
          city: data.city || undefined,
          country: data.country || undefined,
          timezone: data.timezone || 'UTC',
          maxEndpoints: data.maxEndpoints || 100,
          maxQueues: data.maxQueues || 50,
          dialplanConfig,
        };

        await tenantsService.create(createData);

        toast({
          title: 'Tenant créé',
          description: `Le tenant "${data.name}" a été créé avec succès.`,
        });
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving tenant:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.response?.data?.error?.message || 'Une erreur est survenue lors de l\'enregistrement du tenant.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegenerateContext = () => {
    if (nameValue) {
      const generatedContext = tenantsService.generateContextName(nameValue);
      setValue('context', generatedContext);
      setAutoGenerateContext(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Modifier le tenant' : 'Créer un nouveau tenant'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Modifiez les informations du tenant.'
              : 'Remplissez les informations pour créer un nouveau tenant.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information - Always Visible */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Informations de base</h3>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Nom du tenant <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Nom unique du tenant"
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="companyName">Nom de l'entreprise</Label>
              <Input
                id="companyName"
                {...register('companyName')}
                placeholder="Nom commercial de l'entreprise"
                disabled={isSubmitting}
              />
              {errors.companyName && (
                <p className="text-sm text-destructive">{errors.companyName.message}</p>
              )}
            </div>

            {/* Context */}
            <div className="space-y-2">
              <Label htmlFor="context">Contexte Asterisk</Label>
              <div className="flex gap-2">
                <Input
                  id="context"
                  {...register('context')}
                  placeholder="Auto-généré depuis le nom"
                  disabled={isSubmitting}
                  onChange={(e) => {
                    setValue('context', e.target.value);
                    setAutoGenerateContext(false);
                  }}
                />
                {!isEditMode && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleRegenerateContext}
                    disabled={isSubmitting || !nameValue}
                    title="Régénérer le contexte"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {errors.context && (
                <p className="text-sm text-destructive">{errors.context.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Laissez vide pour auto-génération. Format: lettres minuscules, chiffres, tirets et underscores uniquement.
              </p>
            </div>
          </div>

          {/* Contact Information - Collapsible */}
          <Collapsible open={contactOpen} onOpenChange={setContactOpen}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" className="w-full justify-start p-0 hover:bg-transparent">
                {contactOpen ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                <h3 className="text-sm font-semibold">Informations de contact</h3>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              {/* Contact Email */}
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Email de contact</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  {...register('contactEmail')}
                  placeholder="contact@exemple.com"
                  disabled={isSubmitting}
                />
                {errors.contactEmail && (
                  <p className="text-sm text-destructive">{errors.contactEmail.message}</p>
                )}
              </div>

              {/* Contact Phone */}
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Téléphone de contact</Label>
                <Input
                  id="contactPhone"
                  {...register('contactPhone')}
                  placeholder="+33 1 23 45 67 89"
                  disabled={isSubmitting}
                />
                {errors.contactPhone && (
                  <p className="text-sm text-destructive">{errors.contactPhone.message}</p>
                )}
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  {...register('address')}
                  placeholder="123 Rue Exemple"
                  disabled={isSubmitting}
                />
              </div>

              {/* City and Country */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Ville</Label>
                  <Input
                    id="city"
                    {...register('city')}
                    placeholder="Paris"
                    disabled={isSubmitting}
                  />
                  {errors.city && (
                    <p className="text-sm text-destructive">{errors.city.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Pays</Label>
                  <Input
                    id="country"
                    {...register('country')}
                    placeholder="France"
                    disabled={isSubmitting}
                  />
                  {errors.country && (
                    <p className="text-sm text-destructive">{errors.country.message}</p>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Configuration - Collapsible */}
          <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" className="w-full justify-start p-0 hover:bg-transparent">
                {configOpen ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                <h3 className="text-sm font-semibold">Configuration</h3>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              {/* Timezone */}
              <div className="space-y-2">
                <Label htmlFor="timezone">Fuseau horaire</Label>
                <Select
                  value={watch('timezone')}
                  onValueChange={(value) => setValue('timezone', value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un fuseau horaire" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Max Endpoints and Max Queues */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxEndpoints">Max Endpoints</Label>
                  <Input
                    id="maxEndpoints"
                    type="number"
                    {...register('maxEndpoints', { valueAsNumber: true })}
                    min="1"
                    max="10000"
                    disabled={isSubmitting}
                  />
                  {errors.maxEndpoints && (
                    <p className="text-sm text-destructive">{errors.maxEndpoints.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxQueues">Max Files d'attente</Label>
                  <Input
                    id="maxQueues"
                    type="number"
                    {...register('maxQueues', { valueAsNumber: true })}
                    min="1"
                    max="1000"
                    disabled={isSubmitting}
                  />
                  {errors.maxQueues && (
                    <p className="text-sm text-destructive">{errors.maxQueues.message}</p>
                  )}
                </div>
              </div>

              {/* Is Active (Edit mode only) */}
              {isEditMode && (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="isActive">Statut du tenant</Label>
                    <p className="text-xs text-muted-foreground">
                      Activer ou désactiver le tenant
                    </p>
                  </div>
                  <Switch
                    id="isActive"
                    checked={watch('isActive')}
                    onCheckedChange={(checked) => setValue('isActive', checked)}
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Advanced Dialplan Configuration - Collapsible */}
          <Collapsible open={dialplanOpen} onOpenChange={setDialplanOpen}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" className="w-full justify-start p-0 hover:bg-transparent">
                {dialplanOpen ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                <h3 className="text-sm font-semibold">Configuration Dialplan (Avancé)</h3>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <p className="text-xs text-muted-foreground mb-4">
                Configuration du plan de numérotation Asterisk. Les valeurs par défaut conviennent à la plupart des cas.
              </p>

              {/* Internal Dial Pattern */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="internalDialPattern">Pattern Interne</Label>
                  <Input
                    id="internalDialPattern"
                    {...register('internalDialPattern')}
                    placeholder="_1XXX"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ex: _1XXX pour 1000-1999
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="internalDialTimeout">Timeout (secondes)</Label>
                  <Input
                    id="internalDialTimeout"
                    type="number"
                    {...register('internalDialTimeout', { valueAsNumber: true })}
                    min="1"
                    max="300"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Queue and Voicemail Patterns */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="queuePattern">Pattern Files d'attente</Label>
                  <Input
                    id="queuePattern"
                    {...register('queuePattern')}
                    placeholder="_5XXX"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ex: _5XXX pour 5000-5999
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="voicemailPattern">Pattern Messagerie</Label>
                  <Input
                    id="voicemailPattern"
                    {...register('voicemailPattern')}
                    placeholder="*XXX"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ex: *XXX pour *000-*999
                  </p>
                </div>
              </div>

              {/* Test Extension */}
              <div className="space-y-2">
                <Label htmlFor="testExtension">Extension de test</Label>
                <Input
                  id="testExtension"
                  {...register('testExtension')}
                  placeholder="999"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  Numéro pour tester la configuration (ex: 999)
                </p>
              </div>

              {/* Allow External */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allowExternal">Autoriser les appels externes</Label>
                  <p className="text-xs text-muted-foreground">
                    Permettre les appels vers l'extérieur
                  </p>
                </div>
                <Switch
                  id="allowExternal"
                  checked={watch('allowExternal')}
                  onCheckedChange={(checked) => setValue('allowExternal', checked)}
                  disabled={isSubmitting}
                />
              </div>

              {/* External Pattern and Prefix (only if allowExternal is true) */}
              {allowExternalValue && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="externalPattern">Pattern Externe</Label>
                    <Input
                      id="externalPattern"
                      {...register('externalPattern')}
                      placeholder="_0XXXXXXXXX"
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-muted-foreground">
                      Ex: _0XXXXXXXXX pour numéros locaux
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="externalPrefix">Préfixe Externe</Label>
                    <Input
                      id="externalPrefix"
                      {...register('externalPrefix')}
                      placeholder="9"
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-muted-foreground">
                      Ex: 9 pour composer 9+numéro
                    </p>
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

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
