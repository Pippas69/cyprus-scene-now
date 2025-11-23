import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

/**
 * Hook to check if the current user has admin role
 * Uses the secure has_role() function from the database
 */
export const useAdminRole = () => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
    });
  }, []);

  return useQuery({
    queryKey: ['admin-role', userId],
    queryFn: async () => {
      if (!userId) return false;

      // Call the has_role RPC function (security definer)
      const { data, error } = await supabase
        .rpc('has_role', {
          _user_id: userId,
          _role: 'admin'
        });

      if (error) {
        console.error('Error checking admin role:', error);
        return false;
      }

      return data as boolean;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};
