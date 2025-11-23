import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AdminStats {
  totalUsers: number;
  userGrowth: number;
  totalBusinesses: number;
  verifiedBusinesses: number;
  pendingBusinesses: number;
  rejectedBusinesses: number;
  activeEvents: number;
  activeOffers: number;
  pendingVerifications: number;
  unreviewedReports: number;
  needsGeocoding: number;
}

/**
 * Hook to fetch dashboard statistics for admin
 */
export const useAdminStats = () => {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get users from last 30 days for growth calculation
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: newUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      const userGrowth = totalUsers ? ((newUsers || 0) / totalUsers) * 100 : 0;

      // Get businesses by status
      const { count: totalBusinesses } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true });

      const { count: verifiedBusinesses } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true })
        .eq('verified', true);

      const { count: pendingBusinesses } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true })
        .is('verified', null);

      const { count: rejectedBusinesses } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true })
        .eq('verified', false);

      // Get active events (happening now or in the next 7 days)
      const now = new Date().toISOString();
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const { count: activeEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .gte('end_at', now)
        .lte('start_at', nextWeek.toISOString());

      // Get active offers (currently within date range)
      const { count: activeOffers } = await supabase
        .from('discounts')
        .select('*', { count: 'exact', head: true })
        .eq('active', true)
        .lte('start_at', now)
        .gte('end_at', now);

      // Get pending verifications
      const { count: pendingVerifications } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true })
        .is('verified', null);

      // Get unreviewed reports
      const { count: unreviewedReports } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Get businesses without geocoding
      const { count: needsGeocoding } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true })
        .is('geo', null);

      return {
        totalUsers: totalUsers || 0,
        userGrowth: Math.round(userGrowth),
        totalBusinesses: totalBusinesses || 0,
        verifiedBusinesses: verifiedBusinesses || 0,
        pendingBusinesses: pendingBusinesses || 0,
        rejectedBusinesses: rejectedBusinesses || 0,
        activeEvents: activeEvents || 0,
        activeOffers: activeOffers || 0,
        pendingVerifications: pendingVerifications || 0,
        unreviewedReports: unreviewedReports || 0,
        needsGeocoding: needsGeocoding || 0,
      } as AdminStats;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};
