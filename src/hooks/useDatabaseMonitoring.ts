import { useQuery } from '@tanstack/react-query';

interface SlowQuery {
  timestamp: string;
  duration_ms: number;
  query: string;
  user: string;
}

interface ConnectionStat {
  state: string;
  count: number;
}

interface DatabaseMetrics {
  slowQueries: SlowQuery[];
  connectionStats: ConnectionStat[];
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  errorRate: number;
  avgQueryTime: number;
}

export const useDatabaseMonitoring = () => {
  return useQuery({
    queryKey: ['database-monitoring'],
    queryFn: async (): Promise<DatabaseMetrics> => {
      // For now, return mock data since we need to use supabase--analytics-query tool
      // which is only available during development/debugging
      const slowQueries: SlowQuery[] = [];
      const connectionStats: ConnectionStat[] = [
        { state: 'active', count: 5 },
        { state: 'idle', count: 15 },
        { state: 'idle in transaction', count: 2 },
      ];
      
      const totalConnections = connectionStats.reduce((sum, stat) => sum + stat.count, 0);
      const activeConnections = connectionStats.find(s => s.state === 'active')?.count || 0;
      const idleConnections = connectionStats.find(s => s.state === 'idle')?.count || 0;
      
      const errorRate = 0.5;
      const avgQueryTime = 250;

      return {
        slowQueries,
        connectionStats,
        totalConnections,
        activeConnections,
        idleConnections,
        errorRate,
        avgQueryTime,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};
