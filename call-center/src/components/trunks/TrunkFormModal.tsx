import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ChevronDown, Eye, EyeOff } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';

import trunksService, {
  type Trunk,
  type CreateTrunkDto,
  type UpdateTrunkDto,
  TRANSPORT_OPTIONS,
  DESTINATION_TYPES,
} from '@/api/trunks';
import tenantsService from '@/api/tenants';
import queuesService from '@/api/queues';
import useAuthStore from '@/store/authStore';
import { UserRole } from '@/api/auth';

interface TrunkFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trunk?: Trunk | null;
  onSuccess?: () => void;
}

// Zod validation schema
const trunkSchema = z.object({
  name: z
    .string()
    .min(3, 'Le nom doit contenir au moins 3 caractères')
    .max(40, 'Le nom ne peut pas dépasser 40 caractères')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Le nom ne peut contenir que des lettres, chiffres, tirets et underscores'),
  displayName: z.string().optional(),
  description: z.string().optional(),
  remoteHost: z
    .string()
    .min(1, 'Le serveur SIP est requis')
    .regex(/^[a-zA-Z0-9.-]+:\d+$/, 'Format invalide. Utilisez IP:PORT ou hostname:PORT (ex: 192.168.1.1:5060)'),
  username: z.string().min(1, 'Le nom d\'utilisateur est requis').max(100),
  password: z.string().min(1, 'Le mot de passe est requis').max(100),
  transport: z.string(),
  context: z.string(),
  sendsRegistrations: z.boolean(),
  sendsAuth: z.boolean(),
  clientUri: z.string().optional(),
  serverUri: z.string().optional(),
  retryInterval: z.number().min(10).max(3600),
  expiration: z.number().min(60).max(7200),
  maxRetries: z.number().min(1).max(50),
  forbiddenRetryInterval: z.number().min(0).optional(),
  line: z.boolean().optional(),
  outboundProxy: z.string().optional(),
  supportPath: z.boolean().optional(),
  destinationType: z.enum(['queue', 'extension', 'ivr']).optional().nullable(),
  destinationId: z.string().optional(),
  didPattern: z.string(),
});

type TrunkFormData = z.infer<typeof trunkSchema>;

export default function TrunkFormModal({
  open,
  onOpenChange,
  trunk,
  onSuccess,
}: TrunkFormModalProps) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [routingOpen, setRoutingOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isEditMode = !!trunk;
  const isAdmin = user?.role === UserRole.ADMIN;

  const form = useForm<TrunkFormData>({
    resolver: zodResolver(trunkSchema),
    defaultValues: {
      name: '',
      remoteHost: '',
      username: '',
      password: '',
      transport: 'transport-udp',
      context: 'from-trunk',
      sendsRegistrations: true,
      sendsAuth: true,
      retryInterval: 60,
      expiration: 3600,
      maxRetries: 10,
      didPattern: '_X.',
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = form;


  // Load queues for destination selection
  const { data: queues } = useQuery({
    queryKey: ['queues'],
    queryFn: () => queuesService.getAll(),
    enabled: open,
    staleTime: 2 * 60 * 1000,
  });

  // Load trunk data in edit mode
  useEffect(() => {
    if (trunk) {
      setValue('name', trunk.name);
      setValue('displayName', trunk.displayName || '');
      setValue('description', trunk.description || '');
      setValue('remoteHost', trunk.remoteHost);
      setValue('username', trunk.username);
      setValue('transport', trunk.transport);
      setValue('context', trunk.context);
      setValue('sendsRegistrations', trunk.sendsRegistrations);
      setValue('sendsAuth', trunk.sendsAuth);
      setValue('clientUri', trunk.clientUri || '');
      setValue('serverUri', trunk.serverUri || '');
      setValue('retryInterval', trunk.retryInterval);
      setValue('expiration', trunk.expiration);
      setValue('maxRetries', trunk.maxRetries);
      setValue('forbiddenRetryInterval', trunk.forbiddenRetryInterval || 0);
      setValue('line', trunk.line || false);
      setValue('outboundProxy', trunk.outboundProxy || '');
      setValue('supportPath', trunk.supportPath || false);
      setValue('destinationType', trunk.destinationType || null);
      setValue('destinationId', trunk.destinationId || '');
      setValue('didPattern', trunk.didPattern || '_X.');
    }
  }, [trunk, setValue]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      reset();
      setAdvancedOpen(false);
      setRoutingOpen(false);
      setShowPassword(false);
    }
  }, [open, reset]);

  // Watch destination type for conditional rendering
  const destinationType = watch('destinationType');

  // Handle form submission
  const onSubmit = async (data: TrunkFormData) => {
    setIsSubmitting(true);

    try {
      if (isEditMode && trunk) {
        // Update trunk
        const updateData: UpdateTrunkDto = {
          displayName: data.displayName || undefined,
          description: data.description || undefined,
          remoteHost: data.remoteHost,
          username: data.username,
          password: data.password || undefined,
          transport: data.transport,
          context: data.context,
          sendsRegistrations: data.sendsRegistrations,
          sendsAuth: data.sendsAuth,
          clientUri: data.clientUri || undefined,
          serverUri: data.serverUri || undefined,
          retryInterval: Number(data.retryInterval),
          expiration: Number(data.expiration),
          maxRetries: Number(data.maxRetries),
          forbiddenRetryInterval: data.forbiddenRetryInterval ? Number(data.forbiddenRetryInterval) : undefined,
          line: data.line,
          outboundProxy: data.outboundProxy || undefined,
          supportPath: data.supportPath,
          destinationType: data.destinationType || undefined,
          destinationId: data.destinationId || undefined,
          didPattern: data.didPattern || undefined,
        };

        await trunksService.update(trunk.id, updateData);

        toast({
          title: 'Trunk mis à jour',
          description: `Le trunk "${trunksService.getDisplayName(trunk)}" a été mis à jour avec succès.`,
        });
      } else {
        // Create new trunk (global - no tenant association)
        const createData: CreateTrunkDto = {
          name: data.name,
          displayName: data.displayName || undefined,
          description: data.description || undefined,
          remoteHost: data.remoteHost,
          username: data.username,
          password: data.password,
          transport: data.transport,
          context: data.context,
          sendsRegistrations: data.sendsRegistrations,
          sendsAuth: data.sendsAuth,
          clientUri: data.clientUri || undefined,
          serverUri: data.serverUri || undefined,
          retryInterval: Number(data.retryInterval),
          expiration: Number(data.expiration),
          maxRetries: Number(data.maxRetries),
          forbiddenRetryInterval: data.forbiddenRetryInterval ? Number(data.forbiddenRetryInterval) : undefined,
          line: data.line,
          outboundProxy: data.outboundProxy || undefined,
          supportPath: data.supportPath,
        };

        await trunksService.create(createData);

        toast({
          title: 'Trunk créé',
          description: `Le trunk "${data.name}" a été créé avec succès.`,
        });
      }

      onOpenChange(false);

      setTimeout(() => {
        onSuccess?.();
      }, 1000);
    } catch (error: any) {
      console.error('Error saving trunk:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description:
          error.response?.data?.error?.message ||
          error.response?.data?.message ||
          `Une erreur est survenue lors de ${isEditMode ? 'la mise à jour' : 'la création'} du trunk.`,
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
            {isEditMode ? 'Modifier le trunk SIP' : 'Créer un nouveau trunk SIP'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Modifiez la configuration du trunk SIP.'
              : 'Créez une nouvelle interconnexion SIP pour connecter votre système à un opérateur externe.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informations de base</h3>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Nom du trunk <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="operator_trunk, voip_provider..."
                disabled={isEditMode || isSubmitting}
                className={isEditMode ? 'bg-muted' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
              {isEditMode && (
                <p className="text-xs text-muted-foreground">
                  Le nom du trunk ne peut pas être modifié après création.
                </p>
              )}
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Nom d'affichage</Label>
              <Input
                id="displayName"
                {...register('displayName')}
                placeholder="Mon opérateur VoIP (optionnel)"
                disabled={isSubmitting}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Description du trunk (optionnel)"
                disabled={isSubmitting}
                rows={2}
              />
            </div>
          </div>

          {/* SIP Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Configuration SIP</h3>

            {/* Remote Host */}
            <div className="space-y-2">
              <Label htmlFor="remoteHost">
                Serveur SIP <span className="text-destructive">*</span>
              </Label>
              <Input
                id="remoteHost"
                {...register('remoteHost')}
                placeholder="192.168.1.1:5060 ou sip.provider.com:5060"
                disabled={isSubmitting}
                className="font-mono"
              />
              {errors.remoteHost && (
                <p className="text-sm text-destructive">{errors.remoteHost.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Format: IP:PORT ou hostname:PORT
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username">
                  Nom d'utilisateur <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="username"
                  {...register('username')}
                  placeholder="sip_user"
                  disabled={isSubmitting}
                  autoComplete="off"
                />
                {errors.username && (
                  <p className="text-sm text-destructive">{errors.username.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">
                  Mot de passe {!isEditMode && <span className="text-destructive">*</span>}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    placeholder={isEditMode ? 'Laisser vide pour ne pas changer' : 'Mot de passe'}
                    disabled={isSubmitting}
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Transport */}
              <div className="space-y-2">
                <Label htmlFor="transport">Transport</Label>
                <Select
                  value={watch('transport')}
                  onValueChange={(value) => setValue('transport', value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un transport" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSPORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Context */}
              <div className="space-y-2">
                <Label htmlFor="context">Contexte</Label>
                <Input
                  id="context"
                  {...register('context')}
                  placeholder="from-trunk"
                  disabled={isSubmitting}
                  className="font-mono"
                />
              </div>
            </div>

            {/* Registration Options */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendsRegistrations"
                  checked={watch('sendsRegistrations')}
                  onCheckedChange={(checked) => setValue('sendsRegistrations', checked as boolean)}
                  disabled={isSubmitting}
                />
                <Label htmlFor="sendsRegistrations" className="cursor-pointer">
                  Envoyer les registrations
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendsAuth"
                  checked={watch('sendsAuth')}
                  onCheckedChange={(checked) => setValue('sendsAuth', checked as boolean)}
                  disabled={isSubmitting}
                />
                <Label htmlFor="sendsAuth" className="cursor-pointer">
                  Envoyer l'authentification
                </Label>
              </div>
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
                  <span className="font-semibold">Options avancées</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      advancedOpen ? 'rotate-180' : ''
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Retry Interval */}
                  <div className="space-y-2">
                    <Label htmlFor="retryInterval">Retry Interval (s)</Label>
                    <Input
                      id="retryInterval"
                      type="number"
                      {...register('retryInterval', { valueAsNumber: true })}
                      placeholder="60"
                      disabled={isSubmitting}
                      min="10"
                      max="3600"
                    />
                    <p className="text-xs text-muted-foreground">10-3600 secondes</p>
                  </div>

                  {/* Expiration */}
                  <div className="space-y-2">
                    <Label htmlFor="expiration">Expiration (s)</Label>
                    <Input
                      id="expiration"
                      type="number"
                      {...register('expiration', { valueAsNumber: true })}
                      placeholder="3600"
                      disabled={isSubmitting}
                      min="60"
                      max="7200"
                    />
                    <p className="text-xs text-muted-foreground">60-7200 secondes</p>
                  </div>

                  {/* Max Retries */}
                  <div className="space-y-2">
                    <Label htmlFor="maxRetries">Max Retries</Label>
                    <Input
                      id="maxRetries"
                      type="number"
                      {...register('maxRetries', { valueAsNumber: true })}
                      placeholder="10"
                      disabled={isSubmitting}
                      min="1"
                      max="50"
                    />
                    <p className="text-xs text-muted-foreground">1-50 tentatives</p>
                  </div>

                  {/* Forbidden Retry Interval */}
                  <div className="space-y-2">
                    <Label htmlFor="forbiddenRetryInterval">Forbidden Retry (s)</Label>
                    <Input
                      id="forbiddenRetryInterval"
                      type="number"
                      {...register('forbiddenRetryInterval', { valueAsNumber: true })}
                      placeholder="0"
                      disabled={isSubmitting}
                      min="0"
                    />
                  </div>

                  {/* Client URI */}
                  <div className="space-y-2">
                    <Label htmlFor="clientUri">Client URI</Label>
                    <Input
                      id="clientUri"
                      {...register('clientUri')}
                      placeholder="sip:user@domain (optionnel)"
                      disabled={isSubmitting}
                      className="font-mono"
                    />
                  </div>

                  {/* Server URI */}
                  <div className="space-y-2">
                    <Label htmlFor="serverUri">Server URI</Label>
                    <Input
                      id="serverUri"
                      {...register('serverUri')}
                      placeholder="sip:server@domain (optionnel)"
                      disabled={isSubmitting}
                      className="font-mono"
                    />
                  </div>

                  {/* Outbound Proxy */}
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="outboundProxy">Outbound Proxy</Label>
                    <Input
                      id="outboundProxy"
                      {...register('outboundProxy')}
                      placeholder="sip:proxy:5060 (optionnel)"
                      disabled={isSubmitting}
                      className="font-mono"
                    />
                  </div>
                </div>

                {/* Additional Options */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="line"
                      checked={watch('line')}
                      onCheckedChange={(checked) => setValue('line', checked as boolean)}
                      disabled={isSubmitting}
                    />
                    <Label htmlFor="line" className="cursor-pointer">
                      Line support
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="supportPath"
                      checked={watch('supportPath')}
                      onCheckedChange={(checked) => setValue('supportPath', checked as boolean)}
                      disabled={isSubmitting}
                    />
                    <Label htmlFor="supportPath" className="cursor-pointer">
                      Support Path header
                    </Label>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Routing Configuration */}
          <Collapsible
            open={routingOpen}
            onOpenChange={setRoutingOpen}
            disabled={trunk?.tenantId === null}
          >
            <div className="space-y-4">
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                  disabled={isSubmitting || trunk?.tenantId === null}
                >
                  <span className="font-semibold">
                    Configuration de routage (optionnel)
                    {destinationType && (
                      <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                        {trunksService.getDestinationTypeLabel(destinationType)}
                      </span>
                    )}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      routingOpen ? 'rotate-180' : ''
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>

              {trunk?.tenantId === null && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">
                    La configuration de routage n'est disponible qu'après association du trunk avec un tenant.
                    <br />
                    Veuillez d'abord associer ce trunk à un tenant en utilisant le bouton d'association dans la liste des trunks.
                  </p>
                </div>
              )}

              <CollapsibleContent className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  Configurez où router automatiquement les appels entrants sur ce trunk.
                </p>

                {/* Destination Type */}
                <div className="space-y-2">
                  <Label htmlFor="destinationType">Type de destination</Label>
                  <Select
                    value={destinationType || 'none'}
                    onValueChange={(value) =>
                      setValue('destinationType', value === 'none' ? null : (value as any))
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Aucune destination" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune destination</SelectItem>
                      {DESTINATION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Destination ID - Conditional based on type */}
                {destinationType === 'queue' && (
                  <div className="space-y-2">
                    <Label htmlFor="destinationId">File d'attente</Label>
                    <Select
                      value={watch('destinationId')}
                      onValueChange={(value) => setValue('destinationId', value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une queue" />
                      </SelectTrigger>
                      <SelectContent>
                        {queues?.map((queue) => (
                          <SelectItem key={queue.name} value={queue.name}>
                            {queuesService.getDisplayName(queue)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {destinationType === 'extension' && (
                  <div className="space-y-2">
                    <Label htmlFor="destinationId">Extension</Label>
                    <Input
                      id="destinationId"
                      {...register('destinationId')}
                      placeholder="Numéro d'extension (ex: 100)"
                      disabled={isSubmitting}
                    />
                  </div>
                )}

                {destinationType === 'ivr' && (
                  <div className="space-y-2">
                    <Label htmlFor="destinationId">Menu IVR</Label>
                    <Input
                      id="destinationId"
                      {...register('destinationId')}
                      placeholder="ID du menu IVR"
                      disabled={isSubmitting}
                    />
                  </div>
                )}

                {/* DID Pattern */}
                {destinationType && (
                  <div className="space-y-2">
                    <Label htmlFor="didPattern">Pattern DID</Label>
                    <Input
                      id="didPattern"
                      {...register('didPattern')}
                      placeholder="_X."
                      disabled={isSubmitting}
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Pattern Asterisk pour matcher les DIDs entrants (ex: _X. pour tous)
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
