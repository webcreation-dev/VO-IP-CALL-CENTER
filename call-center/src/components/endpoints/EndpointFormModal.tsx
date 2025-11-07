import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

import endpointsService, { type Endpoint, type EndpointCreateRequest, type EndpointCreateResponse } from '@/api/endpoints';
import metadataService from '@/api/metadata';
import tenantsService from '@/api/tenants';
import useAuthStore from '@/store/authStore';
import { UserRole } from '@/api/auth';
import { EndpointCredentialsDialog } from './EndpointCredentialsDialog';
import { useRoles } from '@/hooks/useRoles';

// Validation schema
const endpointSchema = z.object({
  tenantId: z
    .number()
    .min(1, 'Sélectionnez un tenant')
    .optional(),
  displayName: z
    .string()
    .max(100, 'Le nom d\'affichage ne peut pas dépasser 100 caractères')
    .optional(),
  password: z
    .string()
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères')
    .max(80, 'Le mot de passe ne peut pas dépasser 80 caractères'),
  callerid: z
    .string()
    .max(40, 'Le Caller ID ne peut pas dépasser 40 caractères')
    .optional(),
  context: z
    .string()
    .max(40, 'Le contexte ne peut pas dépasser 40 caractères')
    .optional(),
  transport: z
    .string()
    .max(40, 'Le transport ne peut pas dépasser 40 caractères')
    .optional(),
  codecs: z
    .string()
    .max(200, 'La liste des codecs ne peut pas dépasser 200 caractères')
    .optional(),
  directMedia: z
    .enum(['yes', 'no'])
    .optional(),
  dtmfMode: z
    .string()
    .optional(),
  maxContacts: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional(),
  mailboxes: z
    .string()
    .max(100, 'Les boîtes vocales ne peuvent pas dépasser 100 caractères')
    .optional(),
  roleId: z
    .number()
    .optional(),
});

type EndpointFormData = z.infer<typeof endpointSchema>;

interface EndpointFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  endpoint?: Endpoint | null;
  onSuccess?: () => void;
}

export default function EndpointFormModal({
  open,
  onOpenChange,
  endpoint,
  onSuccess,
}: EndpointFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [credentials, setCredentials] = useState<{
    agentNumber: number;
    generatedUsername: string;
    password: string;
  } | null>(null);
  const { toast } = useToast();
  const { user } = useAuthStore();

  // Load available roles
  const { data: roles = [] } = useRoles(true);

  // Load available transports from Asterisk (dynamic)
  const { data: transports } = useQuery({
    queryKey: ['metadata', 'transports-available'],
    queryFn: () => metadataService.getAvailableTransports('fr'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: dtmfModes } = useQuery({
    queryKey: ['metadata', 'dtmf-modes'],
    queryFn: () => metadataService.getDtmfModes('fr'),
    staleTime: 5 * 60 * 1000,
  });

  // Load tenants for SUPER_ADMIN
  const { data: tenants } = useQuery({
    queryKey: ['tenants', 'active'],
    queryFn: () => tenantsService.getAll({ isActive: true, limit: 100 }),
    enabled: user?.role === UserRole.SUPER_ADMIN,
    staleTime: 5 * 60 * 1000,
  });

  const availableCodecs = metadataService.getAvailableCodecs();

  // Default context based on tenant
  const defaultContext = user?.tenantId ? `t${user.tenantId}_default` : 'default';

  // Form setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EndpointFormData>({
    resolver: zodResolver(endpointSchema),
    defaultValues: {
      tenantId: user?.tenantId || undefined,
      displayName: '',
      password: '',
      callerid: '',
      context: defaultContext,
      transport: 'transport-udp',
      codecs: 'ulaw,alaw',
      directMedia: 'yes',
      dtmfMode: 'rfc4733',
      maxContacts: 1,
      mailboxes: '',
      roleId: undefined,
    },
  });

  // Reset form when endpoint changes or modal opens
  useEffect(() => {
    if (open) {
      if (endpoint) {
        // Edit mode
        reset({
          displayName: endpoint.displayName,
          password: '', // Don't populate password for security
          callerid: endpoint.callerid || '',
          context: endpoint.context || defaultContext,
          transport: endpoint.transport || 'transport-udp',
          codecs: endpoint.allow || 'ulaw,alaw',
          directMedia: 'yes', // Not in endpoint entity
          dtmfMode: 'rfc4733',
          maxContacts: 1,
          mailboxes: '',
          roleId: endpoint.roleId,
        });
      } else {
        // Create mode
        reset({
          displayName: '',
          password: '',
          callerid: '',
          context: defaultContext,
          transport: 'transport-udp',
          codecs: 'ulaw,alaw',
          directMedia: 'yes',
          dtmfMode: 'rfc4733',
          maxContacts: 1,
          mailboxes: '',
          roleId: undefined,
        });
      }
    }
  }, [open, endpoint, reset, defaultContext]);

  // Submit handler
  const onSubmit = async (data: EndpointFormData) => {
    setIsSubmitting(true);

    try {
      if (endpoint) {
        // Update endpoint
        await endpointsService.updateEndpoint(endpoint.id, {
          password: data.password || undefined,
          callerid: data.callerid,
          context: data.context,
          transport: data.transport,
          codecs: data.codecs,
          directMedia: data.directMedia,
          dtmfMode: data.dtmfMode,
          maxContacts: data.maxContacts,
          mailboxes: data.mailboxes,
          roleId: data.roleId,
        });

        toast({
          title: 'Endpoint modifié',
          description: `L'endpoint a été modifié avec succès.`,
          variant: 'success',
        });

        onOpenChange(false);
        onSuccess?.();
      } else {
        // Create endpoint
        const createData: EndpointCreateRequest = {
          tenantId: data.tenantId,
          displayName: data.displayName,
          password: data.password,
          callerid: data.callerid,
          context: data.context || defaultContext,
          transport: data.transport,
          codecs: data.codecs,
          directMedia: data.directMedia,
          dtmfMode: data.dtmfMode,
          maxContacts: data.maxContacts,
          mailboxes: data.mailboxes,
          roleId: data.roleId,
        };

        const response: EndpointCreateResponse = await endpointsService.createEndpoint(createData);

        // Store credentials and show dialog
        setCredentials({
          agentNumber: response.agentNumber,
          generatedUsername: response.generatedUsername,
          password: data.password,
        });
        setShowCredentials(true);

        // Don't close the modal yet - wait for credentials dialog to close
        // onOpenChange(false); will be called when credentials dialog closes
        onSuccess?.();
      }
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.error?.message || 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle credentials dialog close
  const handleCredentialsClose = (open: boolean) => {
    setShowCredentials(open);
    if (!open) {
      // Close the main modal after credentials dialog is closed
      onOpenChange(false);
      setCredentials(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {endpoint ? 'Modifier l\'endpoint' : 'Créer un endpoint'}
          </DialogTitle>
          <DialogDescription>
            {endpoint
              ? 'Modifiez les informations de l\'endpoint SIP'
              : 'Créez un nouvel endpoint SIP pour un agent ou un téléphone'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Informations de base */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Informations de Base
            </h3>

            {/* Tenant Selection - SUPER_ADMIN only */}
            {user?.role === UserRole.SUPER_ADMIN && (
              <div className="space-y-2">
                <Label htmlFor="tenantId">
                  Tenant <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={watch('tenantId')?.toString()}
                  onValueChange={(value) => {
                    const newTenantId = parseInt(value);
                    setValue('tenantId', newTenantId);
                    // Auto-update context when tenant changes
                    setValue('context', `t${newTenantId}_default`);
                  }}
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
                <p className="text-xs text-muted-foreground">
                  Sélectionnez le tenant propriétaire de cet endpoint
                </p>
              </div>
            )}

            {/* Display Name (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="displayName">
                Nom d'affichage (optionnel)
              </Label>
              <Input
                id="displayName"
                {...register('displayName')}
                placeholder="Ex: Agent Commercial 1"
              />
              {errors.displayName && (
                <p className="text-sm text-destructive">{errors.displayName.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Nom convivial pour identifier l'agent. Le numéro d'agent sera généré automatiquement.
              </p>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">
                Mot de passe {!endpoint && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="password"
                type="password"
                {...register('password')}
                placeholder={endpoint ? 'Laisser vide pour ne pas changer' : 'Minimum 6 caractères'}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Caller ID */}
            <div className="space-y-2">
              <Label htmlFor="callerid">Caller ID</Label>
              <Input
                id="callerid"
                {...register('callerid')}
                placeholder="Jean Dupont <101>"
              />
              {errors.callerid && (
                <p className="text-sm text-destructive">{errors.callerid.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Format: "Nom Prénom &lt;numéro&gt;"
              </p>
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <Label htmlFor="roleId">Rôle (optionnel)</Label>
              <Select
                value={watch('roleId')?.toString() || 'none'}
                onValueChange={(value) => {
                  setValue('roleId', value === 'none' ? undefined : parseInt(value));
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucun rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun rôle</SelectItem>
                  {roles?.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.displayName} - Niveau {role.level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.roleId && (
                <p className="text-sm text-destructive">{errors.roleId.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Définit les permissions d'appel basées sur la hiérarchie
              </p>
            </div>
          </div>

          {/* Configuration SIP */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Configuration SIP
            </h3>

            {/* Context */}
            <div className="space-y-2">
              <Label htmlFor="context">Contexte</Label>
              <Input
                id="context"
                {...register('context')}
                placeholder={
                  watch('tenantId')
                    ? `t${watch('tenantId')}_default`
                    : defaultContext
                }
              />
              {errors.context && (
                <p className="text-sm text-destructive">{errors.context.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Contexte dialplan Asterisk (défaut: t{watch('tenantId') || user?.tenantId || '1'}_default)
              </p>
            </div>

            {/* Transport */}
            <div className="space-y-2">
              <Label htmlFor="transport">Transport</Label>
              <Select
                value={watch('transport')}
                onValueChange={(value) => setValue('transport', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un transport" />
                </SelectTrigger>
                <SelectContent>
                  {transports?.map((transport) => (
                    <SelectItem key={transport.key} value={transport.key}>
                      {transport.label.fr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.transport && (
                <p className="text-sm text-destructive">{errors.transport.message}</p>
              )}
            </div>

            {/* Codecs */}
            <div className="space-y-2">
              <Label htmlFor="codecs">Codecs autorisés</Label>
              <Input
                id="codecs"
                {...register('codecs')}
                placeholder="ulaw,alaw,g722"
              />
              {errors.codecs && (
                <p className="text-sm text-destructive">{errors.codecs.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Liste séparée par des virgules. Disponibles: {availableCodecs.map(c => c.key).join(', ')}
              </p>
            </div>
          </div>

          {/* Options Avancées (Collapsible) */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" className="w-full justify-between">
                <span className="text-sm font-semibold">Options Avancées</span>
                {showAdvanced ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              {/* Direct Media */}
              <div className="space-y-2">
                <Label htmlFor="directMedia">Direct Media</Label>
                <Select
                  value={watch('directMedia')}
                  onValueChange={(value: 'yes' | 'no') => setValue('directMedia', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Oui</SelectItem>
                    <SelectItem value="no">Non</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Permet le RTP direct entre endpoints (bypass Asterisk)
                </p>
              </div>

              {/* DTMF Mode */}
              <div className="space-y-2">
                <Label htmlFor="dtmfMode">Mode DTMF</Label>
                <Select
                  value={watch('dtmfMode')}
                  onValueChange={(value) => setValue('dtmfMode', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {dtmfModes?.map((mode) => (
                      <SelectItem key={mode.key} value={mode.key}>
                        {mode.label.fr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Max Contacts */}
              <div className="space-y-2">
                <Label htmlFor="maxContacts">Maximum de contacts</Label>
                <Input
                  id="maxContacts"
                  type="number"
                  {...register('maxContacts', { valueAsNumber: true })}
                  min={1}
                  max={10}
                />
                <p className="text-xs text-muted-foreground">
                  Nombre maximum de registrations simultanées
                </p>
              </div>

              {/* Mailboxes */}
              <div className="space-y-2">
                <Label htmlFor="mailboxes">Boîtes vocales</Label>
                <Input
                  id="mailboxes"
                  {...register('mailboxes')}
                  placeholder="101@default"
                />
                {errors.mailboxes && (
                  <p className="text-sm text-destructive">{errors.mailboxes.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Format: extension@context (séparés par des virgules)
                </p>
              </div>
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
              {isSubmitting ? 'Enregistrement...' : endpoint ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Credentials Dialog - Shows after successful creation */}
      {credentials && (
        <EndpointCredentialsDialog
          open={showCredentials}
          onOpenChange={handleCredentialsClose}
          agentNumber={credentials.agentNumber}
          generatedUsername={credentials.generatedUsername}
          password={credentials.password}
        />
      )}
    </Dialog>
  );
}
