import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format, startOfDay, endOfDay } from 'date-fns';

interface DateRange {
  from: Date;
  to: Date;
}

interface UserGrowthData {
  date: string;
  users: number;
  cumulative: number;
}

interface CategoryData {
  category: string;
  count: number;
}

interface CityData {
  city: string;
  count: number;
}

interface TopBusiness {
  id: string;
  name: string;
  city: string;
  events_count: number;
  views_count: number;
  followers_count: number;
}

export const useAdminAnalytics = (dateRange: DateRange) => {
  // User growth over time
  const userGrowth = useQuery({
    queryKey: ['admin-analytics-user-growth', dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async (): Promise<UserGrowthData[]> => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', startOfDay(dateRange.from).toISOString())
        .lte('created_at', endOfDay(dateRange.to).toISOString())
        .order('created_at');

      if (!profiles) return [];

      // Group by date
      const grouped: Record<string, number> = {};
      profiles.forEach(profile => {
        const date = format(new Date(profile.created_at), 'yyyy-MM-dd');
        grouped[date] = (grouped[date] || 0) + 1;
      });

      // Get cumulative count before start date
      const { count: priorCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .lt('created_at', startOfDay(dateRange.from).toISOString());

      // Build array with cumulative
      let cumulative = priorCount || 0;
      const result: UserGrowthData[] = [];
      
      const days = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
      for (let i = 0; i <= days; i++) {
        const date = format(subDays(dateRange.to, days - i), 'yyyy-MM-dd');
        const count = grouped[date] || 0;
        cumulative += count;
        result.push({ date, users: count, cumulative });
      }

      return result;
    },
  });

  // Events by category
  const eventsByCategory = useQuery({
    queryKey: ['admin-analytics-events-category'],
    queryFn: async (): Promise<CategoryData[]> => {
      const { data: events } = await supabase
        .from('events')
        .select('category');

      if (!events) return [];

      const categoryCounts: Record<string, number> = {};
      events.forEach(event => {
        if (Array.isArray(event.category)) {
          event.category.forEach((cat: string) => {
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
          });
        }
      });

      return Object.entries(categoryCounts)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
  });

  // Users by city
  const usersByCity = useQuery({
    queryKey: ['admin-analytics-users-city'],
    queryFn: async (): Promise<CityData[]> => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('city')
        .not('city', 'is', null);

      if (!profiles) return [];

      const cityCounts: Record<string, number> = {};
      profiles.forEach(profile => {
        if (profile.city) {
          cityCounts[profile.city] = (cityCounts[profile.city] || 0) + 1;
        }
      });

      return Object.entries(cityCounts)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
  });

  // Businesses by city
  const businessesByCity = useQuery({
    queryKey: ['admin-analytics-businesses-city'],
    queryFn: async (): Promise<CityData[]> => {
      const { data: businesses } = await supabase
        .from('businesses')
        .select('city')
        .eq('verified', true);

      if (!businesses) return [];

      const cityCounts: Record<string, number> = {};
      businesses.forEach(business => {
        cityCounts[business.city] = (cityCounts[business.city] || 0) + 1;
      });

      return Object.entries(cityCounts)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count);
    },
  });

  // Top businesses by activity
  const topBusinesses = useQuery({
    queryKey: ['admin-analytics-top-businesses'],
    queryFn: async (): Promise<TopBusiness[]> => {
      // Get businesses with their event counts
      const { data: businesses } = await supabase
        .from('businesses')
        .select(`
          id,
          name,
          city
        `)
        .eq('verified', true)
        .limit(50);

      if (!businesses) return [];

      // Get event counts for each business
      const businessIds = businesses.map(b => b.id);
      
      const [eventsData, viewsData, followersData] = await Promise.all([
        supabase
          .from('events')
          .select('business_id')
          .in('business_id', businessIds),
        supabase
          .from('event_views')
          .select('event_id, events!inner(business_id)')
          .in('events.business_id', businessIds),
        supabase
          .from('business_followers')
          .select('business_id')
          .in('business_id', businessIds)
          .is('unfollowed_at', null),
      ]);

      // Count events per business
      const eventCounts: Record<string, number> = {};
      eventsData.data?.forEach((e: { business_id: string }) => {
        eventCounts[e.business_id] = (eventCounts[e.business_id] || 0) + 1;
      });

      // Count views per business
      const viewCounts: Record<string, number> = {};
      viewsData.data?.forEach((v: { events: { business_id: string } }) => {
        const bid = v.events?.business_id;
        if (bid) viewCounts[bid] = (viewCounts[bid] || 0) + 1;
      });

      // Count followers per business
      const followerCounts: Record<string, number> = {};
      followersData.data?.forEach((f: { business_id: string }) => {
        followerCounts[f.business_id] = (followerCounts[f.business_id] || 0) + 1;
      });

      return businesses
        .map(b => ({
          id: b.id,
          name: b.name,
          city: b.city,
          events_count: eventCounts[b.id] || 0,
          views_count: viewCounts[b.id] || 0,
          followers_count: followerCounts[b.id] || 0,
        }))
        .sort((a, b) => (b.events_count + b.views_count + b.followers_count) - (a.events_count + a.views_count + a.followers_count))
        .slice(0, 10);
    },
  });

  // Summary stats
  const summaryStats = useQuery({
    queryKey: ['admin-analytics-summary', dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async () => {
      const [
        totalUsers,
        newUsers,
        totalBusinesses,
        totalEvents,
        activeEvents,
        totalRsvps,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', startOfDay(dateRange.from).toISOString())
          .lte('created_at', endOfDay(dateRange.to).toISOString()),
        supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('verified', true),
        supabase.from('events').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }).gte('end_at', new Date().toISOString()),
        supabase.from('rsvps').select('id', { count: 'exact', head: true }),
      ]);

      return {
        totalUsers: totalUsers.count || 0,
        newUsers: newUsers.count || 0,
        totalBusinesses: totalBusinesses.count || 0,
        totalEvents: totalEvents.count || 0,
        activeEvents: activeEvents.count || 0,
        totalRsvps: totalRsvps.count || 0,
      };
    },
  });

  return {
    userGrowth: userGrowth.data || [],
    userGrowthLoading: userGrowth.isLoading,
    eventsByCategory: eventsByCategory.data || [],
    eventsByCategoryLoading: eventsByCategory.isLoading,
    usersByCity: usersByCity.data || [],
    usersByCityLoading: usersByCity.isLoading,
    businessesByCity: businessesByCity.data || [],
    businessesByCityLoading: businessesByCity.isLoading,
    topBusinesses: topBusinesses.data || [],
    topBusinessesLoading: topBusinesses.isLoading,
    summaryStats: summaryStats.data,
    summaryStatsLoading: summaryStats.isLoading,
    isLoading: userGrowth.isLoading || summaryStats.isLoading,
  };
};
