import { useState } from 'react';
import { Search, Filter, CheckCircle, XCircle, AlertCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/layout/PageHeader';

import { useAuditLogs, useAuditLogStats } from '@/hooks/useAuditLogs';
import type { AuditAction, DenyReason } from '@/types/roles';

/**
 * Audit Logs Page
 *
 * Features:
 * - View all call permission audit logs
 * - Filter by action (allowed/denied)
 * - Filter by deny reason
 * - Search by endpoint IDs or numbers
 * - Real-time statistics
 * - Auto-refresh every minute
 */
export default function AuditLogs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');

  // Fetch audit logs with filters
  const { data: logs = [], isLoading, refetch } = useAuditLogs({
    action: actionFilter !== 'all' ? (actionFilter as AuditAction) : undefined,
    denyReason: reasonFilter !== 'all' ? (reasonFilter as DenyReason) : undefined,
    limit: 100,
  });

  // Fetch statistics
  const { data: stats } = useAuditLogStats();

  // Filter logs by search query
  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      log.callerEndpointId.toLowerCase().includes(query) ||
      log.calledEndpointId.toLowerCase().includes(query) ||
      log.callerNumber?.toLowerCase().includes(query) ||
      log.calledNumber?.toLowerCase().includes(query)
    );
  });

  // Get action badge
  const getActionBadge = (action: AuditAction) => {
    if (action === 'allowed') {
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
          <CheckCircle className="h-3 w-3 mr-1" />
          Autorisé
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        Refusé
      </Badge>
    );
  };

  // Get deny reason label
  const getDenyReasonLabel = (reason?: DenyReason) => {
    if (!reason) return '-';

    const labels: Record<DenyReason, string> = {
      endpoint_not_found: 'Endpoint introuvable',
      inter_context_denied: 'Inter-contexte refusé',
      role_permission_denied: 'Permission de rôle refusée',
    };

    return labels[reason] || reason;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm:ss', { locale: fr });
  };

  return (
    <div className="h-full bg-background">
      <PageHeader
        title="Logs d'Audit"
        description="Suivi des tentatives d'appel et des décisions de permissions"
      />

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Calls */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total d'appels</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Dernières 24h</p>
              </CardContent>
            </Card>

            {/* Allowed Calls */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Appels autorisés</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.allowed}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.allowedPercentage}% du total
                </p>
              </CardContent>
            </Card>

            {/* Denied Calls */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Appels refusés</CardTitle>
                <XCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{stats.denied}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.deniedPercentage}% du total
                </p>
              </CardContent>
            </Card>

            {/* Top Deny Reason */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Raison principale</CardTitle>
                <Filter className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {stats.denied > 0 ? (
                  <>
                    <div className="text-sm font-medium">
                      {getDenyReasonLabel(
                        Object.keys(stats.denyReasons)[0] as DenyReason
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {Object.values(stats.denyReasons)[0]} refus
                    </p>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">Aucun refus</div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle>Logs d'Audit</CardTitle>
            <CardDescription>
              {filteredLogs.length} entrée(s) trouvée(s)
            </CardDescription>

            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par endpoint ou numéro..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Action Filter */}
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filtrer par action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les actions</SelectItem>
                  <SelectItem value="allowed">Autorisés</SelectItem>
                  <SelectItem value="denied">Refusés</SelectItem>
                </SelectContent>
              </Select>

              {/* Deny Reason Filter */}
              <Select value={reasonFilter} onValueChange={setReasonFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filtrer par raison" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les raisons</SelectItem>
                  <SelectItem value="endpoint_not_found">Endpoint introuvable</SelectItem>
                  <SelectItem value="inter_context_denied">Inter-contexte refusé</SelectItem>
                  <SelectItem value="role_permission_denied">Permission refusée</SelectItem>
                </SelectContent>
              </Select>

              {/* Refresh Button */}
              <Button variant="outline" onClick={() => refetch()}>
                <Calendar className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Chargement des logs...</p>
              </div>
            )}

            {/* Logs Table */}
            {!isLoading && filteredLogs.length > 0 && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date/Heure</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Appelant</TableHead>
                      <TableHead>Appelé</TableHead>
                      <TableHead>Contextes</TableHead>
                      <TableHead>Raison</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        {/* Timestamp */}
                        <TableCell className="font-mono text-xs">
                          {formatDate(log.createdAt)}
                        </TableCell>

                        {/* Action */}
                        <TableCell>{getActionBadge(log.action)}</TableCell>

                        {/* Caller */}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-sm">
                              {log.callerNumber || log.callerEndpointId}
                            </div>
                            {log.callerRoleId && (
                              <div className="text-xs text-muted-foreground">
                                Rôle ID: {log.callerRoleId}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Called */}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-sm">
                              {log.calledNumber || log.calledEndpointId}
                            </div>
                            {log.calledRoleId && (
                              <div className="text-xs text-muted-foreground">
                                Rôle ID: {log.calledRoleId}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Contexts */}
                        <TableCell>
                          {log.callerContext && log.calledContext ? (
                            <div className="space-y-1">
                              <div className="text-xs">
                                <span className="font-mono">{log.callerContext}</span>
                                {log.callerContext !== log.calledContext && (
                                  <>
                                    {' → '}
                                    <span className="font-mono">{log.calledContext}</span>
                                  </>
                                )}
                              </div>
                              {log.callerContext !== log.calledContext && (
                                <Badge variant="outline" className="text-xs">
                                  Inter-contexte
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        {/* Deny Reason */}
                        <TableCell>
                          {log.denyReason ? (
                            <span className="text-sm text-destructive">
                              {getDenyReasonLabel(log.denyReason)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && filteredLogs.length === 0 && (
              <div className="text-center py-12">
                <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-gray-900">Aucun log trouvé</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchQuery || actionFilter !== 'all' || reasonFilter !== 'all'
                    ? 'Essayez de modifier vos critères de recherche.'
                    : 'Aucune tentative d\'appel n\'a encore été enregistrée.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
