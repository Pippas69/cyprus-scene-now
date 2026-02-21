import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

interface MonitoringAlert {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  details: any;
  created_at: string;
}

interface DatabaseMetrics {
  slowQueries: SlowQuery[];
  connectionStats: ConnectionStat[];
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  errorRate: number;
  avgQueryTime: number;
  recentAlerts: MonitoringAlert[];
}

export const useDatabaseMonitoring = () => {
  return useQuery({
    queryKey: ['database-monitoring'],
    queryFn: async (): Promise<DatabaseMetrics> => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-check`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.status}`);
      }

      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};
