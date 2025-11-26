import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

/**
 * Hook to check if the current user has admin role
 * Uses the secure has_role() function from the database
 */
export const useAdminRole = () => {
  const [userId, setUserId] = useState<string | null | undefined>(undefined); // undefined = loading, null = no user, string = user id

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const query = useQuery({
    queryKey: ['admin-role', userId],
    queryFn: async () => {
      if (!userId) {
        return false;
      }

      // Call the has_role RPC function (security definer)
      const { data, error } = await supabase
        .rpc('has_role', {
          _user_id: userId,
          _role: 'admin'
        });

      if (error) {
        console.error('[useAdminRole] Error checking admin role:', error);
        return false;
      }

      return data as boolean;
    },
    enabled: userId !== undefined, // Only run when we know if there's a user or not
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Return custom loading state that accounts for disabled query
  return {
    data: query.data,
    isLoading: userId === undefined || query.isLoading,
    error: query.error,
  };
};
