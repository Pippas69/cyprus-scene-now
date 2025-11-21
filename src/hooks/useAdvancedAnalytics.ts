import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, subDays } from 'date-fns';

export interface AnalyticsDateRange {
  startDate: Date;
  endDate: Date;
}

export interface AdvancedAnalytics {
  overview: {
    totalReach: number;
    totalImpressions: number;
    engagementRate: number;
    followerGrowth: number;
    conversionRate: number;
  };
  eventPerformance: Array<{
    eventId: string;
    eventTitle: string;
    reach: number;
    impressions: number;
    interested: number;
    going: number;
    conversionRate: number;
    reservations: number;
  }>;
  discountPerformance: Array<{
    discountId: string;
    discountTitle: string;
    reach: number;
    impressions: number;
    redemptions: number;
    redemptionRate: number;
  }>;
  audienceInsights: {
    ageDistribution: Record<string, number>;
    cityDistribution: Record<string, number>;
    followerTrend: Array<{ date: string; followers: number }>;
  };
  timeAnalytics: {
    hourlyEngagement: Record<number, number>;
    dailyEngagement: Record<string, number>;
  };
}

export const useAdvancedAnalytics = (
  businessId: string | null,
  dateRange: AnalyticsDateRange = {
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  }
) => {
  return useQuery({
    queryKey: ['advanced-analytics', businessId, dateRange],
    queryFn: async () => {
      if (!businessId) throw new Error('Business ID required');

      const startDate = startOfDay(dateRange.startDate).toISOString();
      const endDate = endOfDay(dateRange.endDate).toISOString();

      // Fetch daily analytics aggregates
      const { data: dailyData, error: dailyError } = await supabase
        .from('daily_analytics')
        .select('*')
        .eq('business_id', businessId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (dailyError) throw dailyError;

      // Fetch event views with event details
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          event_views (
            id,
            user_id,
            viewed_at
          ),
          rsvps (
            id,
            status
          ),
          reservations (
            id
          )
        `)
        .eq('business_id', businessId)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (eventsError) throw eventsError;

      // Fetch discount views with discount details
      const { data: discounts, error: discountsError } = await supabase
        .from('discounts')
        .select(`
          id,
          title,
          discount_views (
            id,
            user_id,
            viewed_at
          ),
          redemptions (
            id
          )
        `)
        .eq('business_id', businessId)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (discountsError) throw discountsError;

      // Fetch follower data
      const { data: followers, error: followersError } = await supabase
        .from('business_followers')
        .select('created_at, unfollowed_at')
        .eq('business_id', businessId)
        .gte('created_at', startDate);

      if (followersError) throw followersError;

      // Fetch RSVP demographics
      const { data: rsvpDemographics, error: rsvpError } = await supabase
        .from('rsvps')
        .select(`
          id,
          created_at,
          profiles!inner (
            age,
            city
          )
        `)
        .in('event_id', events?.map(e => e.id) || [])
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (rsvpError) throw rsvpError;

      // Calculate overview metrics
      const totalEventViews = dailyData?.reduce((sum, day) => sum + day.total_event_views, 0) || 0;
      const totalDiscountViews = dailyData?.reduce((sum, day) => sum + day.total_discount_views, 0) || 0;
      const uniqueEventViewers = dailyData?.reduce((sum, day) => sum + day.unique_event_viewers, 0) || 0;
      const uniqueDiscountViewers = dailyData?.reduce((sum, day) => sum + day.unique_discount_viewers, 0) || 0;
      const totalReach = Math.max(uniqueEventViewers, uniqueDiscountViewers);
      const totalImpressions = totalEventViews + totalDiscountViews;

      const totalRSVPs = dailyData?.reduce((sum, day) => sum + day.new_rsvps_interested + day.new_rsvps_going, 0) || 0;
      const engagementRate = totalImpressions > 0 ? (totalRSVPs / totalImpressions) * 100 : 0;

      const activeFollowers = followers?.filter(f => !f.unfollowed_at).length || 0;
      const previousFollowers = followers?.filter(f => 
        new Date(f.created_at) < dateRange.startDate
      ).length || 0;
      const followerGrowth = previousFollowers > 0 
        ? ((activeFollowers - previousFollowers) / previousFollowers) * 100 
        : 0;

      const goingCount = dailyData?.reduce((sum, day) => sum + day.new_rsvps_going, 0) || 0;
      const interestedCount = dailyData?.reduce((sum, day) => sum + day.new_rsvps_interested, 0) || 0;
      const conversionRate = interestedCount > 0 ? (goingCount / interestedCount) * 100 : 0;

      // Calculate event performance
      const eventPerformance = events?.map(event => {
        const views = event.event_views || [];
        const rsvps = event.rsvps || [];
        const reservations = event.reservations || [];
        
        const reach = new Set(views.map(v => v.user_id)).size;
        const impressions = views.length;
        const interested = rsvps.filter(r => r.status === 'interested').length;
        const going = rsvps.filter(r => r.status === 'going').length;
        const convRate = interested > 0 ? (going / interested) * 100 : 0;

        return {
          eventId: event.id,
          eventTitle: event.title,
          reach,
          impressions,
          interested,
          going,
          conversionRate: convRate,
          reservations: reservations.length,
        };
      }) || [];

      // Calculate discount performance
      const discountPerformance = discounts?.map(discount => {
        const views = discount.discount_views || [];
        const redemptions = discount.redemptions || [];
        
        const reach = new Set(views.map(v => v.user_id)).size;
        const impressions = views.length;
        const redemptionRate = impressions > 0 ? (redemptions.length / impressions) * 100 : 0;

        return {
          discountId: discount.id,
          discountTitle: discount.title,
          reach,
          impressions,
          redemptions: redemptions.length,
          redemptionRate,
        };
      }) || [];

      // Calculate audience insights
      const ageDistribution: Record<string, number> = {};
      const cityDistribution: Record<string, number> = {};

      rsvpDemographics?.forEach(rsvp => {
        const profile = rsvp.profiles as any;
        if (profile?.age) {
          const ageBucket = `${Math.floor(profile.age / 10) * 10}-${Math.floor(profile.age / 10) * 10 + 9}`;
          ageDistribution[ageBucket] = (ageDistribution[ageBucket] || 0) + 1;
        }
        if (profile?.city) {
          cityDistribution[profile.city] = (cityDistribution[profile.city] || 0) + 1;
        }
      });

      // Calculate follower trend
      const followerTrend = dailyData?.map(day => ({
        date: day.date,
        followers: day.new_followers - day.unfollows,
      })) || [];

      // Calculate time analytics from RSVP demographics data
      const hourlyEngagement: Record<number, number> = {};
      const dailyEngagement: Record<string, number> = {};

      rsvpDemographics?.forEach(rsvp => {
        const hour = new Date(rsvp.created_at).getHours();
        hourlyEngagement[hour] = (hourlyEngagement[hour] || 0) + 1;

        const day = new Date(rsvp.created_at).toLocaleDateString('en-US', { weekday: 'short' });
        dailyEngagement[day] = (dailyEngagement[day] || 0) + 1;
      });

      const analytics: AdvancedAnalytics = {
        overview: {
          totalReach,
          totalImpressions,
          engagementRate,
          followerGrowth,
          conversionRate,
        },
        eventPerformance,
        discountPerformance,
        audienceInsights: {
          ageDistribution,
          cityDistribution,
          followerTrend,
        },
        timeAnalytics: {
          hourlyEngagement,
          dailyEngagement,
        },
      };

      return analytics;
    },
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
