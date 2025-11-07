import { useState } from 'react';
import { ListOrdered, Clock, User, Hash } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import callsService from '@/api/calls';
import queuesService from '@/api/queues';

export default function QueueCallsTable() {
  const [selectedQueue, setSelectedQueue] = useState<string>('');

  // ========================================
  // Load All Queues
  // ========================================

  const { data: queues = [], isLoading: loadingQueues } = useQuery({
    queryKey: ['queues'],
    queryFn: () => queuesService.getAll(),
    staleTime: 60 * 1000,
  });

  // ========================================
  // Load Calls for Selected Queue
  // ========================================

  const { data: queueCalls, isLoading: loadingCalls } = useQuery({
    queryKey: ['queue-calls', selectedQueue],
    queryFn: () => callsService.getQueueCalls(selectedQueue),
    enabled: !!selectedQueue,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    staleTime: 3000,
  });

  // ========================================
  // Auto-select first queue
  // ========================================

  useState(() => {
    if (!selectedQueue && queues.length > 0) {
      setSelectedQueue(queues[0].name);
    }
  });

  // ========================================
  // Render
  // ========================================

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListOrdered className="h-5 w-5" />
          Appels en File d'Attente
        </CardTitle>
        <CardDescription>
          Visualisez les appels en attente dans les files d'attente de votre centre d'appels.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Queue Selector */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">File d'attente:</label>
          <Select
            value={selectedQueue}
            onValueChange={setSelectedQueue}
            disabled={loadingQueues || queues.length === 0}
          >
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Sélectionnez une file d'attente" />
            </SelectTrigger>
            <SelectContent>
              {queues.map((queue) => (
                <SelectItem key={queue.name} value={queue.name}>
                  {queue.description || queue.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        {queueCalls && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">File d'attente</div>
              <div className="text-xl font-bold">{queueCalls.display_name}</div>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Appels en attente</div>
              <div className="text-xl font-bold">{queueCalls.calls_count}</div>
            </div>
          </div>
        )}

        {/* Calls Table */}
        {loadingCalls ? (
          <div className="text-center py-8 text-muted-foreground">
            Chargement des appels...
          </div>
        ) : !queueCalls ? (
          <div className="text-center py-8 text-muted-foreground">
            Sélectionnez une file d'attente pour voir les appels en attente.
          </div>
        ) : queueCalls.calls_count === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ListOrdered className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun appel en attente dans cette file d'attente</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position</TableHead>
                  <TableHead>Appelant</TableHead>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Temps d'attente</TableHead>
                  <TableHead>Priorité</TableHead>
                  <TableHead>Canal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queueCalls.calls.map((call) => (
                  <TableRow key={call.channel}>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <Hash className="h-3 w-3" />
                        {call.position}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {call.caller_id_name || 'Inconnu'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{call.caller_id_num}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm">
                          {callsService.formatWaitTime(call.wait_time)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={call.priority > 0 ? 'default' : 'secondary'}
                      >
                        {call.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground font-mono">
                        {call.channel}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {queueCalls && queueCalls.calls_count > 0 && (
          <div className="text-xs text-muted-foreground text-right">
            Dernière mise à jour: {new Date(queueCalls.retrieved_at).toLocaleTimeString('fr-FR')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
