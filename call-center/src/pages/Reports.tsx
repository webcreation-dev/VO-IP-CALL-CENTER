import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@/hooks/useDebounce';
import {
  BarChart3,
  Download,
  Search,
  RefreshCw,
  Phone,
  Users,
  Clock,
  TrendingUp,
  Filter,
  Calendar,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useToast } from '@/components/ui/use-toast';

import reportsService, {
  DateRangePreset,
  DATE_RANGE_PRESETS,
  CALL_DISPOSITIONS,
  CallDisposition,
  type CdrFilterDto,
  type StatisticsFilterDto,
} from '@/api/reports';
import tenantsService from '@/api/tenants';
import useAuthStore from '@/store/authStore';
import { UserRole } from '@/api/auth';

export default function Reports() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');

  // Global filters
  const [datePreset, setDatePreset] = useState<DateRangePreset>(DateRangePreset.LAST_7_DAYS);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<number | undefined>(user?.tenantId);

  // CDR filters
  const [cdrSearch, setCdrSearch] = useState('');
  const [cdrDisposition, setCdrDisposition] = useState<CallDisposition | 'all'>('all');
  const [cdrPage, setCdrPage] = useState(1);
  const [cdrLimit] = useState(50);

  // Trend filters
  const [trendGroupBy, setTrendGroupBy] = useState<'hour' | 'day' | 'week' | 'month'>('day');

  const isAdmin = user?.role === UserRole.ADMIN;

  // Debounce search input (wait 500ms after user stops typing)
  const debouncedCdrSearch = useDebouncedValue(cdrSearch, 500);

  // Memoize date range to prevent unnecessary recalculations
  const dateRange = useMemo(() => {
    if (datePreset === DateRangePreset.CUSTOM) {
      return {
        start_date: customStartDate,
        end_date: customEndDate,
      };
    }
    return reportsService.getDateRangeFromPreset(datePreset);
  }, [datePreset, customStartDate, customEndDate]);

  // Memoize statistics filter to stabilize queryKey
  const statsFilter: StatisticsFilterDto = useMemo(
    () => ({
      tenant_id: selectedTenant,
      ...dateRange,
    }),
    [selectedTenant, dateRange]
  );

  // Load tenants for ADMIN
  const { data: tenants } = useQuery({
    queryKey: ['tenants', 'active'],
    queryFn: () => tenantsService.getAll({ isActive: true, limit: 100 }),
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch dashboard stats
  const {
    data: dashboardStats,
    isLoading: isLoadingDashboard,
    refetch: refetchDashboard,
  } = useQuery({
    queryKey: ['reports', 'dashboard', selectedTenant, dateRange.start_date, dateRange.end_date],
    queryFn: () => reportsService.getDashboardStats(statsFilter),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  });

  // Memoize CDR filter to stabilize queryKey
  const cdrFilter: CdrFilterDto = useMemo(
    () => ({
      tenantId: selectedTenant,
      startDate: dateRange.start_date,
      endDate: dateRange.end_date,
      disposition: cdrDisposition !== 'all' ? cdrDisposition : undefined,
      search: debouncedCdrSearch || undefined, // Use debounced value
      page: cdrPage,
      limit: cdrLimit,
    }),
    [selectedTenant, dateRange.start_date, dateRange.end_date, cdrDisposition, debouncedCdrSearch, cdrPage, cdrLimit]
  );

  const {
    data: cdrData,
    isLoading: isLoadingCdr,
    refetch: refetchCdr,
  } = useQuery({
    queryKey: ['reports', 'cdr', selectedTenant, dateRange.start_date, dateRange.end_date, cdrDisposition, debouncedCdrSearch, cdrPage, cdrLimit],
    queryFn: () => reportsService.getCdrRecords(cdrFilter),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    enabled: activeTab === 'cdr', // Only fetch when CDR tab is active
  });

  // Fetch CDR stats
  const {
    data: cdrStats,
    isLoading: isLoadingCdrStats,
  } = useQuery({
    queryKey: ['reports', 'cdr-stats', selectedTenant, dateRange.start_date, dateRange.end_date],
    queryFn: () => reportsService.getCdrStats(statsFilter),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    enabled: activeTab === 'cdr', // Only fetch when CDR tab is active
  });

  // Fetch trend data
  const {
    data: trendData,
    isLoading: isLoadingTrend,
  } = useQuery({
    queryKey: ['reports', 'trend', selectedTenant, dateRange.start_date, dateRange.end_date, trendGroupBy],
    queryFn: () => reportsService.getTrendData({ ...statsFilter, group_by: trendGroupBy }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    enabled: activeTab === 'trends', // Only fetch when Trends tab is active
  });

  // Fetch top callers
  const {
    data: topCallers,
    isLoading: isLoadingTopCallers,
  } = useQuery({
    queryKey: ['reports', 'top-callers', selectedTenant, dateRange.start_date, dateRange.end_date],
    queryFn: () => reportsService.getTopCallers({ ...statsFilter, limit: 10 }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    enabled: activeTab === 'top-performers', // Only fetch when Top Performers tab is active
  });

  // Fetch top destinations
  const {
    data: topDestinations,
    isLoading: isLoadingTopDest,
  } = useQuery({
    queryKey: ['reports', 'top-destinations', selectedTenant, dateRange.start_date, dateRange.end_date],
    queryFn: () => reportsService.getTopDestinations({ ...statsFilter, limit: 10 }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    enabled: activeTab === 'top-performers', // Only fetch when Top Performers tab is active
  });

  // Handle CSV export
  const handleExportCdr = async () => {
    try {
      const blob = await reportsService.exportCdrToCsv(cdrFilter);
      const filename = `cdr-export-${new Date().toISOString().split('T')[0]}.csv`;
      reportsService.downloadCsv(blob, filename);

      toast({
        title: 'Export réussi',
        description: `Le fichier ${filename} a été téléchargé.`,
      });
    } catch (error: any) {
      console.error('Error exporting CDR:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur d\'export',
        description: 'Une erreur est survenue lors de l\'export CSV.',
      });
    }
  };

  // Refresh all data
  const handleRefreshAll = () => {
    refetchDashboard();
    refetchCdr();
  };

  return (
    <div className="h-full bg-background">
      <PageHeader
        title="Rapports & Statistiques"
        description="Analyse des appels, performance et tendances"
        actions={
          <Button onClick={handleRefreshAll} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        }
      />

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Global Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Tenant Filter (ADMIN only) */}
              {isAdmin && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tenant</label>
                  <Select
                    value={selectedTenant?.toString() || 'all'}
                    onValueChange={(value) => setSelectedTenant(value === 'all' ? undefined : parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les tenants</SelectItem>
                      {tenants?.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id.toString()}>
                          {tenant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Date Preset */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Période
                </label>
                <Select
                  value={datePreset}
                  onValueChange={(value) => setDatePreset(value as DateRangePreset)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_RANGE_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Range */}
              {datePreset === DateRangePreset.CUSTOM && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date début</label>
                    <Input
                      type="datetime-local"
                      value={customStartDate.slice(0, 16)}
                      onChange={(e) => setCustomStartDate(new Date(e.target.value).toISOString())}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date fin</label>
                    <Input
                      type="datetime-local"
                      value={customEndDate.slice(0, 16)}
                      onChange={(e) => setCustomEndDate(new Date(e.target.value).toISOString())}
                    />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="cdr">Détail des appels</TabsTrigger>
            <TabsTrigger value="trends">Tendances</TabsTrigger>
            <TabsTrigger value="top">Top Performers</TabsTrigger>
          </TabsList>

          {/* Tab 1: Overview */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Appels</CardTitle>
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoadingDashboard ? '-' : dashboardStats?.calls.total_calls || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isLoadingDashboard ? '-' : dashboardStats?.calls.answered_calls || 0} répondus
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Taux de réponse</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoadingDashboard ? '-' : reportsService.formatPercentage(dashboardStats?.calls.answer_rate_percent || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Performance globale</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Durée moyenne</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoadingDashboard ? '-' : reportsService.formatDuration(Math.round(dashboardStats?.calls.avg_duration_seconds || 0))}
                  </div>
                  <p className="text-xs text-muted-foreground">Par appel</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Appels actifs</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoadingDashboard ? '-' : dashboardStats?.calls.active_calls_now || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">En ce moment</p>
                </CardContent>
              </Card>
            </div>

            {/* Queue Stats */}
            {dashboardStats?.queues && (
              <Card>
                <CardHeader>
                  <CardTitle>Files d'attente ({dashboardStats.queues.total_queues})</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File</TableHead>
                        <TableHead className="text-right">Total Appels</TableHead>
                        <TableHead>Stratégie</TableHead>
                        <TableHead className="text-right">Timeout</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboardStats.queues.queues.map((queue) => (
                        <TableRow key={queue.queue_name}>
                          <TableCell className="font-medium">{queue.queue_name}</TableCell>
                          <TableCell className="text-right">{queue.total_calls}</TableCell>
                          <TableCell><Badge variant="outline">{queue.strategy}</Badge></TableCell>
                          <TableCell className="text-right">{queue.timeout}s</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab 2: CDR */}
          <TabsContent value="cdr" className="space-y-6">
            {/* CDR Stats */}
            {cdrStats && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{cdrStats.totalCalls}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Répondus</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{cdrStats.answeredCalls}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Manqués</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{cdrStats.missedCalls}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Taux</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{reportsService.formatPercentage(cdrStats.answerRate)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Durée moy.</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{reportsService.formatDuration(Math.round(cdrStats.avgDuration))}</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* CDR Filters & Export */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Enregistrements d'appels (CDR)</CardTitle>
                  <Button onClick={handleExportCdr} size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Exporter CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par source, destination..."
                      value={cdrSearch}
                      onChange={(e) => setCdrSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select
                    value={cdrDisposition}
                    onValueChange={(value) => setCdrDisposition(value as CallDisposition | 'all')}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      {CALL_DISPOSITIONS.map((disp) => (
                        <SelectItem key={disp.value} value={disp.value}>
                          {disp.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* CDR Table */}
                {isLoadingCdr ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Chargement des enregistrements...</p>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead>Durée</TableHead>
                          <TableHead>Facturable</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cdrData?.data.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="text-sm">
                              {new Date(record.calldate).toLocaleString('fr-FR')}
                            </TableCell>
                            <TableCell className="font-mono text-sm">{record.src}</TableCell>
                            <TableCell className="font-mono text-sm">{record.dst}</TableCell>
                            <TableCell>{reportsService.formatDurationHHMMSS(record.duration)}</TableCell>
                            <TableCell>{reportsService.formatDurationHHMMSS(record.billsec)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  record.disposition === CallDisposition.ANSWERED
                                    ? 'default'
                                    : 'secondary'
                                }
                              >
                                {reportsService.getDispositionLabel(record.disposition)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    {cdrData && (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Affichage {(cdrPage - 1) * cdrLimit + 1} à{' '}
                          {Math.min(cdrPage * cdrLimit, cdrData.total)} sur {cdrData.total} enregistrements
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCdrPage((p) => Math.max(1, p - 1))}
                            disabled={cdrPage === 1}
                          >
                            Précédent
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCdrPage((p) => p + 1)}
                            disabled={cdrPage * cdrLimit >= cdrData.total}
                          >
                            Suivant
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Trends */}
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Tendances des appels</CardTitle>
                  <Select
                    value={trendGroupBy}
                    onValueChange={(value) => setTrendGroupBy(value as typeof trendGroupBy)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hour">Par heure</SelectItem>
                      <SelectItem value="day">Par jour</SelectItem>
                      <SelectItem value="week">Par semaine</SelectItem>
                      <SelectItem value="month">Par mois</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingTrend ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Chargement des tendances...</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Période</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Répondus</TableHead>
                        <TableHead className="text-right">Échoués</TableHead>
                        <TableHead className="text-right">Taux</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trendData?.map((point, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{point.period}</TableCell>
                          <TableCell className="text-right">{point.total_calls}</TableCell>
                          <TableCell className="text-right text-green-600">{point.answered_calls}</TableCell>
                          <TableCell className="text-right text-red-600">{point.failed_calls}</TableCell>
                          <TableCell className="text-right">
                            {reportsService.formatPercentage(point.answer_rate_percent)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Top Performers */}
          <TabsContent value="top" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Callers */}
              <Card>
                <CardHeader>
                  <CardTitle>Top 10 Appelants</CardTitle>
                  <CardDescription>Les numéros qui appellent le plus</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingTopCallers ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Numéro</TableHead>
                          <TableHead className="text-right">Appels</TableHead>
                          <TableHead className="text-right">Durée moy.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topCallers?.map((caller, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono">{caller.number}</TableCell>
                            <TableCell className="text-right font-bold">{caller.call_count}</TableCell>
                            <TableCell className="text-right">
                              {reportsService.formatDuration(Math.round(caller.avg_duration_seconds))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Top Destinations */}
              <Card>
                <CardHeader>
                  <CardTitle>Top 10 Destinations</CardTitle>
                  <CardDescription>Les numéros les plus appelés</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingTopDest ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Numéro</TableHead>
                          <TableHead className="text-right">Appels</TableHead>
                          <TableHead className="text-right">Durée moy.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topDestinations?.map((dest, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono">{dest.number}</TableCell>
                            <TableCell className="text-right font-bold">{dest.call_count}</TableCell>
                            <TableCell className="text-right">
                              {reportsService.formatDuration(Math.round(dest.avg_duration_seconds))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
