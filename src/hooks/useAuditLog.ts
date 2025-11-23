import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AuditLogEntry {
  id: string;
  admin_user_id: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  old_value: any;
  new_value: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface LogActionParams {
  action_type: string;
  entity_type: string;
  entity_id?: string;
  old_value?: any;
  new_value?: any;
}

/**
 * Hook to log admin actions and view audit log
 */
export const useAuditLog = () => {
  const queryClient = useQueryClient();

  // Function to log an admin action
  const logAction = async (params: LogActionParams) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get user agent and IP (client-side, IP will be approximate)
    const userAgent = navigator.userAgent;
    
    const { error } = await supabase
      .from('admin_audit_log')
      .insert({
        admin_user_id: user.id,
        action_type: params.action_type,
        entity_type: params.entity_type,
        entity_id: params.entity_id || null,
        old_value: params.old_value || null,
        new_value: params.new_value || null,
        user_agent: userAgent,
      });

    if (error) {
      console.error('Error logging admin action:', error);
    }
  };

  // Mutation for logging actions
  const { mutate: log, isPending: isLogging } = useMutation({
    mutationFn: logAction,
    onError: (error) => {
      console.error('Failed to log action:', error);
    },
  });

  // Query to fetch audit log
  const {
    data: auditLog,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['audit-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as AuditLogEntry[];
    },
  });

  return {
    log,
    isLogging,
    auditLog,
    isLoading,
    refetch,
  };
};
