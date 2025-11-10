import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ChevronDown } from 'lucide-react';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/components/ui/use-toast';

import queuesService, {
  type Queue,
  type CreateQueueDto,
  type UpdateQueueDto,
  type QueueRoutingRule,
  QueueStrategy,
  QUEUE_STRATEGIES,
} from '@/api/queues';
import tenantsService from '@/api/tenants';
import contextsService from '@/api/contexts';
import useAuthStore from '@/store/authStore';
import { UserRole } from '@/api/auth';

interface QueueFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queue?: Queue | null;
  onSuccess?: () => void;
}

// Zod validation schema
const queueSchema = z.object({
  tenantId: z.number().min(1, 'Sélectionnez un tenant').optional(),
  name: z
    .string()
    .min(3, 'Le nom doit contenir au moins 3 caractères')
    .max(128, 'Le nom ne peut pas dépasser 128 caractères')
    .regex(/^[a-z0-9_-]+$/, 'Le nom ne peut contenir que des lettres minuscules, chiffres, tirets et underscores'),
  description: z.string().optional(),
  strategy: z.enum(['ringall', 'leastrecent', 'fewestcalls', 'random', 'rrmemory'] as const),
  timeout: z.number().min(1).max(300),
  retry: z.number().min(0).max(60),
  maxlen: z.number().min(0),
  wrapuptime: z.number().min(0).max(3600),
  musicclass: z.string().max(80).optional(),
  servicelevel: z.number().min(1),
  context: z
    .string()
    .min(1, 'Le contexte est requis')
    .max(128, 'Le contexte ne peut pas dépasser 128 caractères'),
  routingRules: z.array(z.object({
    extensionPattern: z
      .string()
      .min(1, 'Le pattern est requis')
      .regex(/^[_0-9a-zA-Z\[\]\-\.\!]+$/, 'Pattern Asterisk invalide'),
    priority: z.number().min(1).optional(),
    queueOptions: z
      .string()
      .max(20, 'Les options ne peuvent pas dépasser 20 caractères')
      .regex(/^[a-zA-Z]*$/, 'Les options doivent contenir uniquement des lettres')
      .optional(),
  })).optional(),
});

type QueueFormData = z.infer<typeof queueSchema>;

export default function QueueFormModal({
  open,
  onOpenChange,
  queue,
  onSuccess,
}: QueueFormModalProps) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [routingRules, setRoutingRules] = useState<QueueRoutingRule[]>([]);

  const isEditMode = !!queue;
  const isAdmin = user?.role === UserRole.ADMIN;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<QueueFormData>({
    resolver: zodResolver(queueSchema),
    defaultValues: {
      tenantId: user?.tenantId,
      name: '',
      description: '',
      strategy: QueueStrategy.RINGALL,
      timeout: 15,
      retry: 5,
      maxlen: 0,
      wrapuptime: 0,
      musicclass: '',
      servicelevel: 60,
      context: '',
      routingRules: [],
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
    enabled: open,
    staleTime: 2 * 60 * 1000,
  });

  // Load queue data in edit mode
  useEffect(() => {
    if (queue) {
      const displayName = queuesService.getDisplayName(queue);
      setValue('name', displayName);
      setValue('description', queue.description || '');
      setValue('strategy', queue.strategy);
      setValue('timeout', queue.timeout);
      setValue('retry', queue.retry);
      setValue('maxlen', queue.maxlen);
      setValue('wrapuptime', queue.wrapuptime);
      setValue('musicclass', queue.musiconhold || '');
      setValue('servicelevel', queue.servicelevel);
      if (queue.context) setValue('context', queue.context);
    }
  }, [queue, setValue]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      reset();
      setAdvancedOpen(false);
      setRoutingRules([]);
    }
  }, [open, reset]);

  // Watch name and tenantId for preview
  const nameValue = watch('name');
  const tenantIdValue = watch('tenantId');

  // Generate preview
  const queuePreview = tenantIdValue
    ? queuesService.generateQueuePreview(tenantIdValue, nameValue)
    : '';

  // Handle form submission
  const onSubmit = async (data: QueueFormData) => {
    setIsSubmitting(true);

    try {
      if (isEditMode && queue) {
        // Update queue
        const updateData: UpdateQueueDto = {
          description: data.description || undefined,
          strategy: data.strategy as QueueStrategy,
          timeout: Number(data.timeout),
          retry: Number(data.retry),
          maxlen: Number(data.maxlen),
          wrapuptime: Number(data.wrapuptime),
          musicclass: data.musicclass || undefined,
          servicelevel: Number(data.servicelevel),
          context: data.context || undefined,
        };

        await queuesService.update(queue.name, updateData);

        toast({
          title: 'File d\'attente mise à jour',
          description: `La file "${queue.name}" a été mise à jour avec succès.`,
        });
      } else {
        // Create new queue
        const createData: CreateQueueDto = {
          tenantId: data.tenantId,
          name: data.name,
          description: data.description || undefined,
          strategy: data.strategy as QueueStrategy,
          timeout: Number(data.timeout),
          retry: Number(data.retry),
          maxlen: Number(data.maxlen),
          wrapuptime: Number(data.wrapuptime),
          musicclass: data.musicclass || undefined,
          servicelevel: Number(data.servicelevel),
          context: data.context,
          routingRules: routingRules.length > 0 ? routingRules : undefined,
        };

        await queuesService.create(createData);

        toast({
          title: 'File d\'attente créée',
          description: `La file "${queuePreview}" a été créée avec succès.`,
        });
      }

      onOpenChange(false);

      // Delay refresh to allow backend processing to complete
      setTimeout(() => {
        onSuccess?.();
      }, 1000);
    } catch (error: any) {
      console.error('Error saving queue:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description:
          error.response?.data?.error?.message ||
          error.response?.data?.message ||
          `Une erreur est survenue lors de ${isEditMode ? 'la mise à jour' : 'la création'} de la file d\'attente.`,
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
            {isEditMode ? 'Modifier la file d\'attente' : 'Créer une nouvelle file d\'attente'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Modifiez la configuration de la file d\'attente.'
              : 'Créez une nouvelle file d\'attente pour gérer les appels entrants.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Tenant Selection - ADMIN only, create mode only */}
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

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informations de base</h3>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Nom de la file <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="support, ventes, technique..."
                disabled={isEditMode || isSubmitting}
                className={isEditMode ? 'bg-muted' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
              {!isEditMode && queuePreview && (
                <p className="text-xs text-muted-foreground">
                  Nom complet : <span className="font-mono font-semibold">{queuePreview}</span>
                </p>
              )}
              {isEditMode && (
                <p className="text-xs text-muted-foreground">
                  Le nom de la file ne peut pas être modifié après création.
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Description de la file (optionnel)"
                disabled={isSubmitting}
                rows={2}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            {/* Strategy */}
            <div className="space-y-2">
              <Label htmlFor="strategy">
                Stratégie de distribution <span className="text-destructive">*</span>
              </Label>
              <Select
                value={watch('strategy')}
                onValueChange={(value) => setValue('strategy', value as QueueStrategy)}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une stratégie" />
                </SelectTrigger>
                <SelectContent>
                  {QUEUE_STRATEGIES.map((strategy) => (
                    <SelectItem key={strategy.value} value={strategy.value}>
                      {strategy.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.strategy && (
                <p className="text-sm text-destructive">{errors.strategy.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Détermine comment les appels sont distribués aux agents disponibles
              </p>
            </div>

            {/* Context Selection */}
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
                  {contexts?.map((context) => (
                    <SelectItem key={context.id} value={context.name}>
                      {contextsService.getDisplayName(context)}
                      <span className="text-xs text-muted-foreground ml-2">
                        ({context.name})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.context && (
                <p className="text-sm text-destructive">{errors.context.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Contexte dialplan pour le routage des appels vers cette queue
              </p>
            </div>
          </div>

          {/* Advanced Configuration */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <div className="space-y-4">
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                  disabled={isSubmitting}
                >
                  <span className="font-semibold">Configuration avancée</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      advancedOpen ? 'rotate-180' : ''
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-4 pt-4">
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
                      placeholder="15"
                      disabled={isSubmitting}
                      min="1"
                      max="300"
                    />
                    {errors.timeout && (
                      <p className="text-sm text-destructive">{errors.timeout.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Durée de sonnerie chez l'agent (1-300s)
                    </p>
                  </div>

                  {/* Retry */}
                  <div className="space-y-2">
                    <Label htmlFor="retry">
                      Retry (secondes) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="retry"
                      type="number"
                      {...register('retry', { valueAsNumber: true })}
                      placeholder="5"
                      disabled={isSubmitting}
                      min="0"
                      max="60"
                    />
                    {errors.retry && (
                      <p className="text-sm text-destructive">{errors.retry.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Délai avant nouvelle tentative (0-60s)
                    </p>
                  </div>

                  {/* Max Length */}
                  <div className="space-y-2">
                    <Label htmlFor="maxlen">
                      Longueur max <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="maxlen"
                      type="number"
                      {...register('maxlen', { valueAsNumber: true })}
                      placeholder="0"
                      disabled={isSubmitting}
                      min="0"
                    />
                    {errors.maxlen && (
                      <p className="text-sm text-destructive">{errors.maxlen.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Nombre max d'appels en attente (0 = illimité)
                    </p>
                  </div>

                  {/* Wrap-up Time */}
                  <div className="space-y-2">
                    <Label htmlFor="wrapuptime">
                      Wrap-up (secondes) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="wrapuptime"
                      type="number"
                      {...register('wrapuptime', { valueAsNumber: true })}
                      placeholder="0"
                      disabled={isSubmitting}
                      min="0"
                      max="3600"
                    />
                    {errors.wrapuptime && (
                      <p className="text-sm text-destructive">{errors.wrapuptime.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Temps après appel avant disponibilité (0-3600s)
                    </p>
                  </div>

                  {/* Service Level */}
                  <div className="space-y-2">
                    <Label htmlFor="servicelevel">
                      Service Level (secondes) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="servicelevel"
                      type="number"
                      {...register('servicelevel', { valueAsNumber: true })}
                      placeholder="60"
                      disabled={isSubmitting}
                      min="1"
                    />
                    {errors.servicelevel && (
                      <p className="text-sm text-destructive">{errors.servicelevel.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Seuil de temps pour le niveau de service
                    </p>
                  </div>

                  {/* Music on Hold */}
                  <div className="space-y-2">
                    <Label htmlFor="musicclass">Musique d'attente</Label>
                    <Input
                      id="musicclass"
                      {...register('musicclass')}
                      placeholder="default"
                      disabled={isSubmitting}
                      maxLength={80}
                    />
                    {errors.musicclass && (
                      <p className="text-sm text-destructive">{errors.musicclass.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Classe musiconhold (optionnel)
                    </p>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Routing Rules Section - Only in create mode */}
          {!isEditMode && (
            <Collapsible>
              <div className="space-y-4">
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                    disabled={isSubmitting}
                  >
                    <span className="font-semibold">
                      Règles de routage (optionnel)
                      {routingRules.length > 0 && (
                        <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                          {routingRules.length} règle{routingRules.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Configurez les extensions qui routeront automatiquement les appels vers cette queue.
                  </p>

                  {/* Display existing rules */}
                  {routingRules.length > 0 && (
                    <div className="space-y-2">
                      {routingRules.map((rule, index) => (
                        <div key={index} className="border rounded-lg p-3 space-y-2 bg-muted/50">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <code className="text-sm font-mono bg-background px-2 py-1 rounded">
                                {rule.extensionPattern}
                              </code>
                              {rule.priority && (
                                <span className="text-xs text-muted-foreground">
                                  Priorité: {rule.priority}
                                </span>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setRoutingRules(routingRules.filter((_, i) => i !== index))
                              }
                            >
                              Supprimer
                            </Button>
                          </div>
                          {rule.queueOptions && (
                            <p className="text-xs text-muted-foreground">
                              Options: <code>{rule.queueOptions}</code>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Simple add form inline */}
                  <div className="border-t pt-4 space-y-3">
                    <h4 className="font-semibold text-sm">Ajouter une règle</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder="Pattern (ex: _3XXX)"
                        id="newPattern"
                        className="font-mono"
                        disabled={isSubmitting}
                      />
                      <Input
                        type="number"
                        placeholder="Priorité (défaut: 1)"
                        id="newPriority"
                        min={1}
                        disabled={isSubmitting}
                      />
                      <Input
                        placeholder="Options (ex: t)"
                        id="newOptions"
                        maxLength={20}
                        disabled={isSubmitting}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isSubmitting}
                      onClick={() => {
                        const patternInput = document.getElementById('newPattern') as HTMLInputElement;
                        const priorityInput = document.getElementById('newPriority') as HTMLInputElement;
                        const optionsInput = document.getElementById('newOptions') as HTMLInputElement;

                        if (patternInput.value) {
                          const newRule: QueueRoutingRule = {
                            extensionPattern: patternInput.value,
                            priority: priorityInput.value ? parseInt(priorityInput.value) : undefined,
                            queueOptions: optionsInput.value || undefined,
                          };
                          setRoutingRules([...routingRules, newRule]);

                          // Clear inputs
                          patternInput.value = '';
                          priorityInput.value = '';
                          optionsInput.value = '';
                        } else {
                          toast({
                            variant: 'destructive',
                            title: 'Erreur',
                            description: 'Le pattern est requis',
                          });
                        }
                      }}
                    >
                      Ajouter la règle
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Exemples: <code>_3XXX</code> (3000-3999), <code>_30XX</code> (3000-3099), <code>3000</code> (exact)
                    </p>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
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
