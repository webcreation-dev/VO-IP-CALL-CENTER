import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Link as LinkIcon, Unlink } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

import trunksService, { type TrunkWithStatus } from '@/api/trunks';
import tenantsService, { type Tenant } from '@/api/tenants';

const associationSchema = z.object({
  tenantId: z.number({
    required_error: 'Veuillez sélectionner un tenant',
  }),
});

type AssociationFormValues = z.infer<typeof associationSchema>;

interface TrunkAssociationModalProps {
  trunk: TrunkWithStatus | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TrunkAssociationModal({
  trunk,
  open,
  onClose,
  onSuccess,
}: TrunkAssociationModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);

  const form = useForm<AssociationFormValues>({
    resolver: zodResolver(associationSchema),
    defaultValues: {
      tenantId: trunk?.tenantId || undefined,
    },
  });

  // Fetch tenants when modal opens
  useEffect(() => {
    if (open) {
      loadTenants();
    }
  }, [open]);

  // Reset form when trunk changes
  useEffect(() => {
    if (trunk) {
      form.reset({
        tenantId: trunk.tenantId || undefined,
      });
    }
  }, [trunk, form]);

  const loadTenants = async () => {
    setIsLoadingTenants(true);
    try {
      const data = await tenantsService.getAll();
      setTenants(data);
    } catch (error: any) {
      console.error('Error loading tenants:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger la liste des tenants.',
      });
    } finally {
      setIsLoadingTenants(false);
    }
  };

  const handleAssociate = async (values: AssociationFormValues) => {
    if (!trunk) return;

    setIsLoading(true);

    try {
      await trunksService.associateTenant(trunk.id, {
        tenantId: values.tenantId,
      });

      toast({
        title: 'Association réussie',
        description: `Le trunk "${trunksService.getDisplayName(trunk)}" a été associé au tenant.`,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error associating trunk:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description:
          error.response?.data?.error?.message ||
          "Une erreur est survenue lors de l'association.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDissociate = async () => {
    if (!trunk) return;

    setIsLoading(true);

    try {
      await trunksService.dissociateTenant(trunk.id);

      toast({
        title: 'Dissociation réussie',
        description: `Le trunk "${trunksService.getDisplayName(trunk)}" a été dissocié du tenant.`,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error dissociating trunk:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description:
          error.response?.data?.error?.message ||
          'Une erreur est survenue lors de la dissociation.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!trunk) return null;

  const isCurrentlyAssociated = trunk.tenantId !== null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isCurrentlyAssociated ? 'Gérer' : 'Associer'} le trunk
          </DialogTitle>
          <DialogDescription>
            {isCurrentlyAssociated
              ? `Modifier ou dissocier le trunk "${trunksService.getDisplayName(trunk)}" d'un tenant`
              : `Associer le trunk "${trunksService.getDisplayName(trunk)}" à un tenant`}
          </DialogDescription>
        </DialogHeader>

        {isCurrentlyAssociated && (
          <div className="p-3 bg-muted rounded-md border">
            <p className="text-sm">
              Ce trunk est actuellement associé au tenant{' '}
              <strong>
                {trunk.tenant?.name || `ID ${trunk.tenantId}`}
                {trunk.tenant?.companyName && ` (${trunk.tenant.companyName})`}
              </strong>.
              {trunk.destinationType && trunk.destinationId && (
                <>
                  <br />
                  <br />
                  <span className="text-destructive font-medium">
                    Attention: Le trunk a une configuration de routing active qui sera supprimée
                    lors de la dissociation.
                  </span>
                </>
              )}
            </p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleAssociate)} className="space-y-4">
            <FormField
              control={form.control}
              name="tenantId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tenant</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value, 10))}
                    value={field.value?.toString()}
                    disabled={isLoadingTenants || isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un tenant" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingTenants ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="ml-2 text-sm">Chargement...</span>
                        </div>
                      ) : tenants.length === 0 ? (
                        <div className="py-4 text-center text-sm text-muted-foreground">
                          Aucun tenant disponible
                        </div>
                      ) : (
                        tenants.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id.toString()}>
                            {tenant.name}
                            {tenant.companyName && (
                              <span className="text-muted-foreground ml-2">
                                ({tenant.companyName})
                              </span>
                            )}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              {isCurrentlyAssociated && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDissociate}
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Dissociation...
                    </>
                  ) : (
                    <>
                      <Unlink className="mr-2 h-4 w-4" />
                      Dissocier
                    </>
                  )}
                </Button>
              )}
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 sm:flex-none"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || isLoadingTenants}
                  className="flex-1 sm:flex-none"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="mr-2 h-4 w-4" />
                      {isCurrentlyAssociated ? 'Modifier' : 'Associer'}
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
