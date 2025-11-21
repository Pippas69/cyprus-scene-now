import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, subDays, eachDayOfInterval } from 'date-fns';

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

      // Get all events for this business
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, title, business_id')
        .eq('business_id', businessId);

      if (eventsError) throw eventsError;

      const eventIds = events?.map(e => e.id) || [];

      // Fetch daily analytics (aggregated data)
      const { data: dailyAnalytics, error: dailyError } = await supabase
        .from('daily_analytics')
        .select('*')
        .eq('business_id', businessId)
        .gte('date', startDate.split('T')[0])
        .lte('date', endDate.split('T')[0])
        .order('date', { ascending: true });

      if (dailyError) throw dailyError;

      // Fetch event views for detailed event performance
      const { data: eventViews, error: viewsError } = await supabase
        .from('event_views')
        .select('event_id, user_id, viewed_at')
        .in('event_id', eventIds)
        .gte('viewed_at', startDate)
        .lte('viewed_at', endDate);

      if (viewsError) throw viewsError;

      // Fetch RSVPs
      const { data: rsvps, error: rsvpsError } = await supabase
        .from('rsvps')
        .select('event_id, user_id, status, created_at')
        .in('event_id', eventIds)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (rsvpsError) throw rsvpsError;

      // Fetch reservations
      const { data: reservations, error: reservationsError } = await supabase
        .from('reservations')
        .select('event_id, user_id, created_at')
        .in('event_id', eventIds)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (reservationsError) throw reservationsError;

      // Fetch discounts
      const { data: discounts, error: discountsError } = await supabase
        .from('discounts')
        .select('id, title')
        .eq('business_id', businessId);

      if (discountsError) throw discountsError;

      const discountIds = discounts?.map(d => d.id) || [];

      const { data: discountViews, error: discountViewsError } = await supabase
        .from('discount_views')
        .select('discount_id, user_id, viewed_at')
        .in('discount_id', discountIds)
        .gte('viewed_at', startDate)
        .lte('viewed_at', endDate);

      if (discountViewsError) throw discountViewsError;

      const { data: redemptions, error: redemptionsError } = await supabase
        .from('redemptions')
        .select('discount_id, redeemed_at')
        .in('discount_id', discountIds)
        .gte('redeemed_at', startDate)
        .lte('redeemed_at', endDate);

      if (redemptionsError) throw redemptionsError;

      // Fetch engagement events for time analytics
      const { data: engagementEvents, error: engagementError } = await supabase
        .from('engagement_events')
        .select('created_at, event_type')
        .eq('business_id', businessId)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (engagementError) throw engagementError;

      // Calculate overview metrics from daily_analytics
      const totalReach = dailyAnalytics?.reduce((sum, day) => sum + (day.unique_event_viewers || 0) + (day.unique_discount_viewers || 0), 0) || 0;
      const totalImpressions = dailyAnalytics?.reduce((sum, day) => sum + (day.total_event_views || 0) + (day.total_discount_views || 0), 0) || 0;
      
      const totalRSVPs = dailyAnalytics?.reduce((sum, day) => sum + (day.new_rsvps_interested || 0) + (day.new_rsvps_going || 0), 0) || 0;
      const engagementRate = totalImpressions > 0 ? (totalRSVPs / totalImpressions) * 100 : 0;

      const interestedCount = dailyAnalytics?.reduce((sum, day) => sum + (day.new_rsvps_interested || 0), 0) || 0;
      const goingCount = dailyAnalytics?.reduce((sum, day) => sum + (day.new_rsvps_going || 0), 0) || 0;
      const conversionRate = interestedCount > 0 ? (goingCount / interestedCount) * 100 : 0;

      // Calculate follower growth accurately
      const { count: followersAtStart } = await supabase
        .from('business_followers')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .lte('created_at', startDate)
        .or(`unfollowed_at.is.null,unfollowed_at.gt.${startDate}`);

      const { count: followersAtEnd } = await supabase
        .from('business_followers')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .lte('created_at', endDate)
        .or(`unfollowed_at.is.null,unfollowed_at.gt.${endDate}`);

      const followerGrowth = (followersAtStart || 0) > 0 
        ? (((followersAtEnd || 0) - (followersAtStart || 0)) / (followersAtStart || 0)) * 100 
        : 0;

      // Calculate event performance
      const eventPerformance = (events || []).map(event => {
        const views = eventViews?.filter(v => v.event_id === event.id) || [];
        const eventRsvps = rsvps?.filter(r => r.event_id === event.id) || [];
        const eventReservations = reservations?.filter(r => r.event_id === event.id) || [];

        const reach = new Set(views.map(v => v.user_id)).size;
        const impressions = views.length;
        const interested = eventRsvps.filter(r => r.status === 'interested').length;
        const going = eventRsvps.filter(r => r.status === 'going').length;
        const eventConversionRate = interested > 0 ? (going / interested) * 100 : 0;

        return {
          eventId: event.id,
          eventTitle: event.title,
          reach,
          impressions,
          interested,
          going,
          conversionRate: eventConversionRate,
          reservations: eventReservations.length,
        };
      });

      // Calculate discount performance
      const discountPerformance = (discounts || []).map(discount => {
        const views = discountViews?.filter(v => v.discount_id === discount.id) || [];
        const discountRedemptions = redemptions?.filter(r => r.discount_id === discount.id) || [];
        const redemptionRate = views.length > 0 ? (discountRedemptions.length / views.length) * 100 : 0;

        const reach = new Set(views.map(v => v.user_id)).size;

        return {
          discountId: discount.id,
          discountTitle: discount.title,
          reach,
          impressions: views.length,
          redemptions: discountRedemptions.length,
          redemptionRate,
        };
      });

      // Calculate audience insights - get ALL engaged users
      const engagedUserIds = new Set([
        ...(eventViews?.map(v => v.user_id).filter(Boolean) || []),
        ...(rsvps?.map(r => r.user_id).filter(Boolean) || []),
        ...(reservations?.map(r => r.user_id).filter(Boolean) || []),
        ...(discountViews?.map(v => v.user_id).filter(Boolean) || []),
      ]);

      const { data: demographics, error: demographicsError } = await supabase
        .from('profiles')
        .select('age, city')
        .in('id', Array.from(engagedUserIds));

      if (demographicsError) throw demographicsError;

      const ageDistribution: Record<string, number> = {};
      const cityDistribution: Record<string, number> = {};

      demographics?.forEach(profile => {
        if (profile.age) {
          let ageGroup = '';
          if (profile.age >= 15 && profile.age <= 17) ageGroup = '15-17';
          else if (profile.age >= 18 && profile.age <= 24) ageGroup = '18-24';
          else if (profile.age >= 25 && profile.age <= 34) ageGroup = '25-34';
          else if (profile.age >= 35 && profile.age <= 44) ageGroup = '35-44';
          else if (profile.age >= 45 && profile.age <= 60) ageGroup = '45-60';
          
          if (ageGroup) {
            ageDistribution[ageGroup] = (ageDistribution[ageGroup] || 0) + 1;
          }
        }

        if (profile.city) {
          cityDistribution[profile.city] = (cityDistribution[profile.city] || 0) + 1;
        }
      });

      // Calculate follower trend - cumulative count for each day
      const dateRangeDays = eachDayOfInterval({
        start: dateRange.startDate,
        end: dateRange.endDate,
      });

      const followerTrend: Array<{ date: string; followers: number }> = [];
      
      for (const day of dateRangeDays) {
        const dayStr = day.toISOString().split('T')[0];
        const { count: followersOnDay } = await supabase
          .from('business_followers')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .lte('created_at', `${dayStr}T23:59:59`)
          .or(`unfollowed_at.is.null,unfollowed_at.gt.${dayStr}T23:59:59`);

        followerTrend.push({
          date: dayStr,
          followers: followersOnDay || 0,
        });
      }

      // Calculate time analytics from engagement_events
      const hourlyEngagement: Record<number, number> = {};
      const dailyEngagement: Record<string, number> = {};

      const dayMap: Record<number, string> = {
        0: 'Sun',
        1: 'Mon',
        2: 'Tue',
        3: 'Wed',
        4: 'Thu',
        5: 'Fri',
        6: 'Sat',
      };

      engagementEvents?.forEach(event => {
        const date = new Date(event.created_at);
        const hour = date.getHours();
        const day = dayMap[date.getDay()];

        hourlyEngagement[hour] = (hourlyEngagement[hour] || 0) + 1;
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
