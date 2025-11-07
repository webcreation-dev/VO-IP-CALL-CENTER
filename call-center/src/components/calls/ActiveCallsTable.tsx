import { useState } from 'react';
import { Phone, PhoneOff, Pause, Play, Mic, MicOff, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import useAuthStore from '@/store/authStore';
import callsService, { type Channel, ChannelState } from '@/api/calls';

interface ActiveCallsTableProps {
  channels: Channel[];
  onRefresh: () => void;
  onTransfer?: (channel: Channel) => void;
}

export default function ActiveCallsTable({ channels, onRefresh, onTransfer }: ActiveCallsTableProps) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [hangupDialog, setHangupDialog] = useState<Channel | null>(null);

  // ========================================
  // Permission Checks
  // ========================================

  const canHangup = user ? callsService.canHangup(user.role) : false;
  const canMute = user ? callsService.canMute(user.role) : false;
  const canHoldUnhold = user ? callsService.canHoldUnhold(user.role) : false;
  const canTransfer = user ? callsService.canTransfer(user.role) : false;

  // ========================================
  // Call Control Actions
  // ========================================

  const handleHangup = async (channel: Channel) => {
    try {
      setLoading(channel.id);
      await callsService.hangupChannel(channel.id, 'normal');
      toast({
        title: 'Appel raccroché',
        description: `L'appel ${channel.caller.number} a été raccroché avec succès.`,
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de raccrocher l\'appel',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
      setHangupDialog(null);
    }
  };

  const handleHold = async (channel: Channel) => {
    try {
      setLoading(channel.id);
      await callsService.holdChannel(channel.id);
      toast({
        title: 'Appel mis en attente',
        description: `L'appel ${channel.caller.number} est maintenant en attente.`,
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre l\'appel en attente',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleUnhold = async (channel: Channel) => {
    try {
      setLoading(channel.id);
      await callsService.unholdChannel(channel.id);
      toast({
        title: 'Appel repris',
        description: `L'appel ${channel.caller.number} a été repris.`,
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de reprendre l\'appel',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleMute = async (channel: Channel) => {
    try {
      setLoading(channel.id);
      await callsService.muteChannel(channel.id, 'both');
      toast({
        title: 'Micro coupé',
        description: `Le micro de l'appel ${channel.caller.number} a été coupé.`,
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de couper le micro',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleUnmute = async (channel: Channel) => {
    try {
      setLoading(channel.id);
      await callsService.unmuteChannel(channel.id, 'both');
      toast({
        title: 'Micro réactivé',
        description: `Le micro de l'appel ${channel.caller.number} a été réactivé.`,
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de réactiver le micro',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  // ========================================
  // Render Helpers
  // ========================================

  const getStateBadgeVariant = (state: ChannelState) => {
    const color = callsService.getChannelStateColor(state);
    switch (color) {
      case 'green':
        return 'default';
      case 'orange':
      case 'yellow':
        return 'secondary';
      case 'red':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getDirectionBadge = (channel: Channel) => {
    const direction = callsService.getCallDirection(channel);
    return direction === 'inbound' ? (
      <Badge variant="outline" className="gap-1">
        <Phone className="h-3 w-3" />
        Entrant
      </Badge>
    ) : (
      <Badge variant="outline" className="gap-1">
        <Phone className="h-3 w-3 rotate-90" />
        Sortant
      </Badge>
    );
  };

  // ========================================
  // Render
  // ========================================

  if (channels.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Aucun appel actif pour le moment</p>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>État</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead>Appelant</TableHead>
              <TableHead>Destinataire</TableHead>
              <TableHead>Durée</TableHead>
              <TableHead>Contexte</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {channels.map((channel) => (
              <TableRow key={channel.id}>
                <TableCell>
                  <Badge variant={getStateBadgeVariant(channel.state)}>
                    {callsService.getChannelStateLabel(channel.state)}
                  </Badge>
                </TableCell>
                <TableCell>{getDirectionBadge(channel)}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{channel.caller.name || 'Inconnu'}</div>
                    <div className="text-sm text-muted-foreground">{channel.caller.number}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{channel.connected.name || 'Inconnu'}</div>
                    <div className="text-sm text-muted-foreground">{channel.connected.number}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm">
                    {callsService.formatCallDurationHHMMSS(channel.creationtime)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{channel.dialplan.context}</div>
                    <div className="text-muted-foreground">{channel.dialplan.exten}</div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {/* Hold/Unhold */}
                    {canHoldUnhold && channel.state === ChannelState.UP && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleHold(channel)}
                          disabled={loading === channel.id}
                          title="Mettre en attente"
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUnhold(channel)}
                          disabled={loading === channel.id}
                          title="Reprendre"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {/* Mute/Unmute */}
                    {canMute && channel.state === ChannelState.UP && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleMute(channel)}
                          disabled={loading === channel.id}
                          title="Couper le micro"
                        >
                          <MicOff className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUnmute(channel)}
                          disabled={loading === channel.id}
                          title="Réactiver le micro"
                        >
                          <Mic className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {/* Transfer */}
                    {canTransfer && channel.state === ChannelState.UP && onTransfer && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onTransfer(channel)}
                        disabled={loading === channel.id}
                        title="Transférer"
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Hangup */}
                    {canHangup && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setHangupDialog(channel)}
                        disabled={loading === channel.id}
                        className="text-destructive hover:text-destructive"
                        title="Raccrocher"
                      >
                        <PhoneOff className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Hangup Confirmation Dialog */}
      <AlertDialog open={!!hangupDialog} onOpenChange={(open) => !open && setHangupDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Raccrocher cet appel ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir raccrocher l'appel avec{' '}
              <strong>{hangupDialog?.caller.number}</strong> ?
              <br />
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => hangupDialog && handleHangup(hangupDialog)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <PhoneOff className="h-4 w-4 mr-2" />
              Raccrocher
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
