import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, UserPlus, Pause, Play, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { UserRole } from '@/api/auth';
import queuesService, { type QueueMember } from '@/api/queues';
import MemberStatusBadge from './MemberStatusBadge';
import AddMemberModal from './AddMemberModal';

interface QueueMembersManagerProps {
  queueName: string;
}

export default function QueueMembersManager({ queueName }: QueueMembersManagerProps) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<QueueMember | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // ========================================
  // Permissions
  // ========================================

  const canManageMembers =
    user &&
    [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR].includes(
      user.role as UserRole
    );

  // ========================================
  // Load Queue Members
  // ========================================

  const {
    data: members = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['queue-members', queueName],
    queryFn: () => queuesService.getMembers(queueName),
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    staleTime: 3000,
  });

  // ========================================
  // Actions Handlers
  // ========================================

  const handlePauseMember = async (member: QueueMember) => {
    try {
      setLoadingAction(member.interface);
      await queuesService.pauseMember(queueName, member.interface, {
        paused: !member.paused,
        reason: !member.paused ? 'Manuel' : undefined,
      });

      toast({
        title: member.paused ? 'Agent repris' : 'Agent mis en pause',
        description: `L'agent ${member.member_name || member.interface} a été ${
          member.paused ? 'repris' : 'mis en pause'
        }.`,
      });

      refetch();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de modifier le statut',
        variant: 'destructive',
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRemoveMember = async (member: QueueMember) => {
    try {
      setLoadingAction(member.interface);
      await queuesService.removeMember(queueName, member.interface);

      toast({
        title: 'Agent retiré',
        description: `L'agent ${member.member_name || member.interface} a été retiré de la file.`,
      });

      setMemberToRemove(null);
      refetch();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de retirer l\'agent',
        variant: 'destructive',
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // ========================================
  // Render Helpers
  // ========================================

  const extractEndpointName = (interfaceName: string): string => {
    // Extract username from PJSIP/t1_101 -> 101
    const match = interfaceName.match(/PJSIP\/t\d+_(\d+)$/);
    if (match) return match[1];

    // Extract from PJSIP/agent_xyz -> agent_xyz
    const match2 = interfaceName.match(/PJSIP\/(.+)$/);
    if (match2) return match2[1];

    return interfaceName;
  };

  const formatLastCall = (timestamp: number): string => {
    if (!timestamp || timestamp === 0) return 'Jamais';
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins}min`;
    if (diffMins < 1440) return `Il y a ${Math.floor(diffMins / 60)}h`;
    return date.toLocaleDateString('fr-FR');
  };

  // ========================================
  // Render
  // ========================================

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Agents de la file d'attente
            </CardTitle>
            <CardDescription>
              Gérez les agents assignés à la file <strong>{queueName}</strong>
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
            {canManageMembers && (
              <Button size="sm" onClick={() => setAddModalOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Ajouter un agent
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        ) : members.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Aucun agent dans cette file d'attente</p>
            {canManageMembers && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setAddModalOpen(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Ajouter le premier agent
              </Button>
            )}
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Interface</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Pénalité</TableHead>
                  <TableHead>Appels traités</TableHead>
                  <TableHead>Dernier appel</TableHead>
                  {canManageMembers && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.interface}>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {extractEndpointName(member.interface)}
                      </code>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {member.member_name || <span className="text-muted-foreground">-</span>}
                      </span>
                    </TableCell>
                    <TableCell>
                      <MemberStatusBadge member={member} />
                      {member.paused && member.paused_reason && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Raison: {member.paused_reason}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={member.penalty > 0 ? 'text-orange-600' : 'text-muted-foreground'}
                      >
                        {member.penalty}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">{member.calls_taken}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatLastCall(member.last_call)}
                      </span>
                    </TableCell>
                    {canManageMembers && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {/* Pause/Unpause Button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handlePauseMember(member)}
                            disabled={loadingAction === member.interface}
                            title={member.paused ? 'Reprendre' : 'Mettre en pause'}
                          >
                            {member.paused ? (
                              <Play className="h-4 w-4" />
                            ) : (
                              <Pause className="h-4 w-4" />
                            )}
                          </Button>

                          {/* Remove Button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setMemberToRemove(member)}
                            disabled={loadingAction === member.interface}
                            className="text-destructive hover:text-destructive"
                            title="Retirer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Add Member Modal */}
      <AddMemberModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        queueName={queueName}
        existingMembers={members}
        onSuccess={refetch}
      />

      {/* Remove Confirmation Dialog */}
      <AlertDialog
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer cet agent ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir retirer l'agent{' '}
              <strong>
                {memberToRemove?.member_name || extractEndpointName(memberToRemove?.interface || '')}
              </strong>{' '}
              de la file d'attente ?<br />
              L'agent ne recevra plus d'appels de cette file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToRemove && handleRemoveMember(memberToRemove)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
