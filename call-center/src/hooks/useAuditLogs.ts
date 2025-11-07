import { useQuery } from '@tanstack/react-query';
import rolesService, { type AuditLogFilters } from '@/api/roles';

/**
 * Hook to fetch audit logs with optional filters
 */
export function useAuditLogs(filters?: AuditLogFilters) {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => rolesService.getAuditLogs(filters),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Auto-refresh every minute
  });
}

/**
 * Hook to fetch audit log statistics
 */
export function useAuditLogStats() {
  return useQuery({
    queryKey: ['audit-logs', 'stats'],
    queryFn: async () => {
      // Fetch last 24 hours of logs to calculate stats
      const logs = await rolesService.getAuditLogs({
        limit: 1000,
      });

      const allowed = logs.filter((log) => log.action === 'allowed').length;
      const denied = logs.filter((log) => log.action === 'denied').length;
      const total = logs.length;

      // Group by deny reason
      const denyReasons: Record<string, number> = {};
      logs
        .filter((log) => log.action === 'denied' && log.denyReason)
        .forEach((log) => {
          const reason = log.denyReason!;
          denyReasons[reason] = (denyReasons[reason] || 0) + 1;
        });

      return {
        total,
        allowed,
        denied,
        allowedPercentage: total > 0 ? Math.round((allowed / total) * 100) : 0,
        deniedPercentage: total > 0 ? Math.round((denied / total) * 100) : 0,
        denyReasons,
      };
    },
    staleTime: 60000, // 1 minute
  });
}
