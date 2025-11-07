import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Phone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import useAuthStore from '@/store/authStore';
import callsService, { type OriginateCallDto } from '@/api/calls';
import endpointsService from '@/api/endpoints';
import contextsService from '@/api/contexts';
import { useQuery } from '@tanstack/react-query';

// ============================================================================
// Form Schema
// ============================================================================

const originateSchema = z.object({
  endpoint: z.string().min(1, 'L\'endpoint est requis'),
  extension: z.string().min(1, 'L\'extension est requise'),
  context: z.string().min(1, 'Le contexte est requis'),
  timeout: z.number().min(5).max(300).optional(),
  callerIdName: z.string().optional(),
  callerIdNumber: z.string().optional(),
});

type OriginateFormData = z.infer<typeof originateSchema>;

// ============================================================================
// Component Props
// ============================================================================

interface OriginateCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export default function OriginateCallDialog({
  open,
  onOpenChange,
  onSuccess,
}: OriginateCallDialogProps) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ========================================
  // Form Setup
  // ========================================

  const form = useForm<OriginateFormData>({
    resolver: zodResolver(originateSchema),
    defaultValues: {
      endpoint: '',
      extension: '',
      context: '',
      timeout: 30,
      callerIdName: '',
      callerIdNumber: '',
    },
  });

  // ========================================
  // Load Endpoints
  // ========================================

  const { data: endpoints = [], isLoading: loadingEndpoints } = useQuery({
    queryKey: ['endpoints'],
    queryFn: () => endpointsService.getEndpoints(),
    enabled: open,
  });

  // ========================================
  // Load Contexts
  // ========================================

  const { data: contexts = [], isLoading: loadingContexts } = useQuery({
    queryKey: ['contexts'],
    queryFn: () => contextsService.getAll(),
    enabled: open,
  });

  // ========================================
  // Reset Form on Open
  // ========================================

  useEffect(() => {
    if (open) {
      form.reset({
        endpoint: '',
        extension: '',
        context: '',
        timeout: 30,
        callerIdName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : '',
        callerIdNumber: '',
      });
    }
  }, [open, form, user]);

  // ========================================
  // Submit Handler
  // ========================================

  const onSubmit = async (data: OriginateFormData) => {
    try {
      setIsSubmitting(true);

      const payload: OriginateCallDto = {
        endpoint: data.endpoint,
        extension: data.extension,
        context: data.context,
        timeout: data.timeout,
        callerIdName: data.callerIdName,
        callerIdNumber: data.callerIdNumber,
      };

      await callsService.originateCall(payload);

      toast({
        title: 'Appel initié',
        description: `L'appel vers ${data.extension} a été lancé avec succès.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'initier l\'appel',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========================================
  // Render
  // ========================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Click-to-Dial
          </DialogTitle>
          <DialogDescription>
            Initiez un appel depuis un endpoint vers une extension.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Endpoint */}
            <FormField
              control={form.control}
              name="endpoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endpoint (source)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={loadingEndpoints}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un endpoint" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {endpoints.map((endpoint) => (
                        <SelectItem key={endpoint.id} value={endpoint.displayName}>
                          {endpoint.displayName} - {endpoint.callerid || 'Aucun CallerID'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Le téléphone ou endpoint qui va recevoir l'appel en premier.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Extension */}
            <FormField
              control={form.control}
              name="extension"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Extension / Numéro (destination)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: 200, 0123456789" />
                  </FormControl>
                  <FormDescription>
                    L'extension ou le numéro à appeler une fois que l'endpoint a répondu.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Context */}
            <FormField
              control={form.control}
              name="context"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contexte</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={loadingContexts}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un contexte" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {contexts.map((context) => (
                        <SelectItem key={context.id} value={context.name}>
                          {context.name} - {context.description || 'Aucune description'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Le contexte de dialplan dans lequel l'appel sera lancé.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Timeout */}
            <FormField
              control={form.control}
              name="timeout"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timeout (secondes)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      value={field.value || 30}
                    />
                  </FormControl>
                  <FormDescription>
                    Durée maximale d'attente de réponse (entre 5 et 300 secondes).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Caller ID Name */}
            <FormField
              control={form.control}
              name="callerIdName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom Appelant (optionnel)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Service Client" />
                  </FormControl>
                  <FormDescription>
                    Le nom qui apparaîtra sur le téléphone destinataire.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Caller ID Number */}
            <FormField
              control={form.control}
              name="callerIdNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numéro Appelant (optionnel)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: 0100000000" />
                  </FormControl>
                  <FormDescription>
                    Le numéro qui apparaîtra sur le téléphone destinataire.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                {isSubmitting ? 'Appel en cours...' : 'Lancer l\'appel'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
