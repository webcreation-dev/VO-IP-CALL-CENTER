import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowRightLeft, Loader2 } from 'lucide-react';
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
import callsService, { type Channel, type BlindTransferDto } from '@/api/calls';
import contextsService from '@/api/contexts';
import { useQuery } from '@tanstack/react-query';

// ============================================================================
// Form Schema
// ============================================================================

const transferSchema = z.object({
  extension: z.string().min(1, 'L\'extension est requise'),
  context: z.string().min(1, 'Le contexte est requis'),
});

type TransferFormData = z.infer<typeof transferSchema>;

// ============================================================================
// Component Props
// ============================================================================

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: Channel | null;
  onSuccess?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export default function TransferDialog({
  open,
  onOpenChange,
  channel,
  onSuccess,
}: TransferDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ========================================
  // Form Setup
  // ========================================

  const form = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      extension: '',
      context: '',
    },
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
    if (open && channel) {
      form.reset({
        extension: '',
        context: channel.dialplan.context,
      });
    }
  }, [open, channel, form]);

  // ========================================
  // Submit Handler
  // ========================================

  const onSubmit = async (data: TransferFormData) => {
    if (!channel) return;

    try {
      setIsSubmitting(true);

      const payload: BlindTransferDto = {
        channelName: channel.name,
        extension: data.extension,
        context: data.context,
      };

      await callsService.blindTransfer(payload);

      toast({
        title: 'Transfert effectué',
        description: `L'appel a été transféré vers ${data.extension}.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de transférer l\'appel',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========================================
  // Render
  // ========================================

  if (!channel) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transfert d'appel
          </DialogTitle>
          <DialogDescription>
            Transférer l'appel de <strong>{channel.caller.number}</strong> vers une autre extension.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Current Call Info */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Appelant:</span>{' '}
                <span className="font-medium">
                  {channel.caller.name || 'Inconnu'} ({channel.caller.number})
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Durée:</span>{' '}
                <span className="font-mono">{callsService.formatCallDuration(channel.creationtime)}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">État:</span>{' '}
                <span className="font-medium">{callsService.getChannelStateLabel(channel.state)}</span>
              </div>
            </div>

            {/* Extension */}
            <FormField
              control={form.control}
              name="extension"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Extension de destination</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: 200, 0123456789" />
                  </FormControl>
                  <FormDescription>
                    L'extension ou le numéro vers lequel transférer l'appel.
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
                    Le contexte de dialplan dans lequel l'appel sera transféré.
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
                {isSubmitting ? 'Transfert en cours...' : 'Transférer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
