import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { UserPlus, Loader2 } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';
import queuesService, { type AddMemberDto, type QueueMember } from '@/api/queues';
import endpointsService, { type Endpoint } from '@/api/endpoints';

// ============================================================================
// Form Schema
// ============================================================================

const addMemberSchema = z.object({
  interface: z.string().min(1, 'Sélectionnez un endpoint'),
  memberName: z.string().optional(),
  penalty: z.number().min(0).max(100).optional(),
  paused: z.boolean().optional(),
});

type AddMemberFormData = z.infer<typeof addMemberSchema>;

// ============================================================================
// Component Props
// ============================================================================

interface AddMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queueName: string;
  existingMembers: QueueMember[];
  onSuccess?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export default function AddMemberModal({
  open,
  onOpenChange,
  queueName,
  existingMembers,
  onSuccess,
}: AddMemberModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ========================================
  // Form Setup
  // ========================================

  const form = useForm<AddMemberFormData>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      interface: '',
      memberName: '',
      penalty: 0,
      paused: false,
    },
  });

  // ========================================
  // Load Endpoints
  // ========================================

  const { data: endpoints = [], isLoading: loadingEndpoints } = useQuery({
    queryKey: ['endpoints'],
    queryFn: () => endpointsService.getEnrichedEndpoints(),
    enabled: open,
  });

  // ========================================
  // Filter Available Endpoints
  // ========================================

  const availableEndpoints = endpoints.filter((endpoint) => {
    // Extract username from displayName (e.g., "agent_xyz123" or "PJSIP/t1_101")
    const username = endpoint.displayName;
    const pjsipInterface = `PJSIP/${username}`;

    // Check if endpoint is already a member
    const isAlreadyMember = existingMembers.some(
      (member) =>
        member.interface === pjsipInterface ||
        member.interface === username ||
        member.interface.includes(username)
    );

    return !isAlreadyMember;
  });

  // ========================================
  // Reset Form on Open
  // ========================================

  useEffect(() => {
    if (open) {
      form.reset({
        interface: '',
        memberName: '',
        penalty: 0,
        paused: false,
      });
    }
  }, [open, form]);

  // ========================================
  // Submit Handler
  // ========================================

  const onSubmit = async (data: AddMemberFormData) => {
    try {
      setIsSubmitting(true);

      // Find selected endpoint
      const selectedEndpoint = endpoints.find(
        (e) => e.displayName === data.interface || e.id === data.interface
      );

      const payload: AddMemberDto = {
        interface: data.interface,
        memberName: data.memberName || selectedEndpoint?.callerid || undefined,
        penalty: data.penalty,
        paused: data.paused,
      };

      await queuesService.addMember(queueName, payload);

      toast({
        title: 'Agent ajouté',
        description: `L'agent ${data.interface} a été ajouté à la file d'attente.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'ajouter l\'agent',
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Ajouter un agent
          </DialogTitle>
          <DialogDescription>
            Ajoutez un endpoint comme agent dans la file d'attente{' '}
            <strong>{queueName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Endpoint Selection */}
            <FormField
              control={form.control}
              name="interface"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endpoint</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={loadingEndpoints || isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un endpoint" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableEndpoints.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          Aucun endpoint disponible
                        </div>
                      ) : (
                        availableEndpoints.map((endpoint) => (
                          <SelectItem key={endpoint.id} value={endpoint.displayName}>
                            <div className="flex items-center gap-2">
                              <span>{endpoint.displayName}</span>
                              {endpoint.deviceState && (
                                <span className="text-xs text-muted-foreground">
                                  ({endpoint.deviceState})
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Sélectionnez l'endpoint qui servira d'agent dans cette file.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Member Name (Optional) */}
            <FormField
              control={form.control}
              name="memberName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom affiché (optionnel)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Jean Dupont" />
                  </FormControl>
                  <FormDescription>
                    Nom personnalisé pour identifier l'agent.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Penalty */}
            <FormField
              control={form.control}
              name="penalty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pénalité (priorité)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                      value={field.value || 0}
                      min={0}
                      max={100}
                    />
                  </FormControl>
                  <FormDescription>
                    Priorité de routage (0 = priorité maximale, 100 = minimale).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Initial Pause State */}
            <FormField
              control={form.control}
              name="paused"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Commencer en pause</FormLabel>
                    <FormDescription>
                      Cochez pour ajouter l'agent en état de pause (il ne recevra pas d'appels).
                    </FormDescription>
                  </div>
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
              <Button type="submit" disabled={isSubmitting || availableEndpoints.length === 0}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Ajout en cours...' : 'Ajouter l\'agent'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
