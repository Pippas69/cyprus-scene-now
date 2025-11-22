import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';

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
    currentFollowers: number;
  };
  eventPerformance: Array<{
    eventId: string;
    eventName: string;
    date: string;
    views: number;
    uniqueViewers: number;
    rsvpsGoing: number;
    rsvpsInterested: number;
    reservations: number;
    conversionRate: number;
  }>;
  discountPerformance: Array<{
    discountId: string;
    discountName: string;
    views: number;
    scans: number;
    verifications: number;
    redemptions: number;
    conversionRate: number;
  }>;
  audienceInsights: {
    ageDistribution: Array<{ range: string; count: number }>;
    cityDistribution: Array<{ city: string; count: number }>;
    genderDistribution: Array<{ gender: string; count: number }>;
    followerTrend: Array<{ date: string; followers: number }>;
  };
  timeAnalytics: {
    hourlyEngagement: Record<number, number>;
    dailyEngagement: Record<string, number>;
  };
  trafficSources: Array<{
    source: string;
    views: number;
    unique_users: number;
    conversions: number;
  }>;
  deviceAnalytics: Array<{
    device_type: string;
    views: number;
    unique_users: number;
    conversions: number;
  }>;
  conversionFunnel: {
    views: number;
    engagements: number;
    interested: number;
    committed: number;
  };
  engagementAnalysis: {
    byType: Record<string, number>;
    avgActionsPerUser: number;
    totalUniqueUsers: number;
  };
  rsvpAnalytics: {
    statusBreakdown: Record<string, number>;
    reservationStats: {
      total: number;
      avgPartySize: number;
      byStatus: Record<string, number>;
    };
    bookingTimeline: Array<{
      daysBeforeEvent: number;
      count: number;
    }>;
  };
  followerGrowthDetailed: {
    timeline: Array<{
      date: string;
      new_followers: number;
      unfollows: number;
    }>;
    churnRate: number;
    bySource: Record<string, number>;
    netGrowth: number;
  };
}

export function useAdvancedAnalytics(
  businessId: string,
  dateRange?: AnalyticsDateRange
) {
  return useQuery({
    queryKey: ['advanced-analytics', businessId, dateRange],
    queryFn: async () => {
      if (!businessId) throw new Error('Business ID is required');

      const startDate = dateRange?.startDate || subDays(new Date(), 30);
      const endDate = dateRange?.endDate || new Date();

      // Use optimized database function for core analytics + fetch supplementary data in parallel
      const [
        { data: rawAnalyticsData, error: analyticsError },
        { data: engagementEvents, error: engagementError }
      ] = await Promise.all([
        supabase.rpc('get_business_analytics', {
          p_business_id: businessId,
          p_start_date: startDate.toISOString(),
          p_end_date: endDate.toISOString()
        }),
        supabase
          .from('engagement_events')
          .select('created_at, event_type')
          .eq('business_id', businessId)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
      ]);

      if (analyticsError) {
        console.error('Error fetching analytics:', analyticsError);
        throw analyticsError;
      }

      if (engagementError) {
        console.error('Error fetching engagement events:', engagementError);
        throw engagementError;
      }

      // Type-safe parsing of JSON response
      const analyticsData = rawAnalyticsData as any;

      // Get unique viewer IDs for audience insights
      const eventViewerIds = new Set(
        analyticsData.eventPerformance?.flatMap((e: any) => 
          Array(e.unique_viewers || 0).fill(null).map((_, i) => `${e.id}_${i}`)
        ) || []
      );

      // Fetch user demographics for audience insights
      const engagedUserIds = analyticsData.eventPerformance
        ?.map((e: any) => e.id)
        .filter(Boolean) || [];

      let userProfiles: any[] = [];
      if (engagedUserIds.length > 0) {
        const { data: eventViews } = await supabase
          .from('event_views')
          .select('user_id')
          .in('event_id', engagedUserIds)
          .gte('viewed_at', startDate.toISOString())
          .lte('viewed_at', endDate.toISOString());

        const uniqueUserIds = Array.from(new Set(eventViews?.map(v => v.user_id).filter(Boolean) || []));

        if (uniqueUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('age, city, gender')
            .in('id', uniqueUserIds);

          userProfiles = profiles || [];
        }
      }

      // Map database response to expected interface
      const dbOverview = analyticsData.overview || {};
      const overview = {
        totalReach: dbOverview.uniqueViewers || 0,
        totalImpressions: dbOverview.totalViews || 0,
        engagementRate: dbOverview.engagementRate || 0,
        followerGrowth: dbOverview.newFollowers || 0,
        conversionRate: dbOverview.conversionRate || 0,
        currentFollowers: dbOverview.newFollowers || 0,
      };

      // Use pre-calculated event performance from database function
      const eventPerformance = analyticsData.eventPerformance?.map((e: any) => ({
        eventId: e.id,
        eventName: e.title,
        date: e.start_at,
        views: e.views || 0,
        uniqueViewers: e.unique_viewers || 0,
        rsvpsGoing: e.rsvps_going || 0,
        rsvpsInterested: e.rsvps_interested || 0,
        reservations: e.reservations || 0,
        conversionRate: e.conversion_rate || 0
      })) || [];

      // Use pre-calculated discount performance from database function
      const discountPerformance = analyticsData.discountPerformance?.map((d: any) => ({
        discountId: d.id,
        discountName: d.title,
        views: d.views || 0,
        scans: d.scans || 0,
        verifications: d.verifications || 0,
        redemptions: d.redemptions || 0,
        conversionRate: d.conversion_rate || 0
      })) || [];

      // 4. Audience Insights - Process user profiles for demographics
      const calculateAgeDistribution = () => {
        if (!userProfiles?.length) return [];
        
        const ageBuckets: Record<string, number> = {
          '15-17': 0,
          '18-24': 0,
          '25-34': 0,
          '35-44': 0,
          '45-60': 0,
          '60+': 0
        };

        userProfiles.forEach(profile => {
          if (!profile.age) return;
          
          if (profile.age >= 15 && profile.age <= 17) ageBuckets['15-17']++;
          else if (profile.age >= 18 && profile.age <= 24) ageBuckets['18-24']++;
          else if (profile.age >= 25 && profile.age <= 34) ageBuckets['25-34']++;
          else if (profile.age >= 35 && profile.age <= 44) ageBuckets['35-44']++;
          else if (profile.age >= 45 && profile.age <= 60) ageBuckets['45-60']++;
          else if (profile.age > 60) ageBuckets['60+']++;
        });

        return Object.entries(ageBuckets)
          .filter(([_, count]) => count > 0)
          .map(([range, count]) => ({ range, count }));
      };

      const calculateGenderDistribution = () => {
        if (!userProfiles?.length) return [];
        
        const genderCounts: Record<string, number> = {};
        userProfiles.forEach(profile => {
          if (profile.gender) {
            genderCounts[profile.gender] = (genderCounts[profile.gender] || 0) + 1;
          }
        });

        return Object.entries(genderCounts).map(([gender, count]) => ({ gender, count }));
      };

      const calculateCityDistribution = () => {
        if (!userProfiles?.length) return [];
        
        const cityCounts: Record<string, number> = {};
        userProfiles.forEach(profile => {
          if (profile.city) {
            cityCounts[profile.city] = (cityCounts[profile.city] || 0) + 1;
          }
        });

        return Object.entries(cityCounts)
          .map(([city, count]) => ({ city, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
      };

      const ageDistribution = calculateAgeDistribution();
      const genderDistribution = calculateGenderDistribution();
      const cityDistribution = calculateCityDistribution();

      // Use pre-calculated follower trend from database function
      const followerTrend = analyticsData.followerTrend || [];

      // 5. Time-based Analytics from engagement events
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
        overview,
        eventPerformance,
        discountPerformance,
        audienceInsights: {
          ageDistribution,
          genderDistribution,
          cityDistribution,
          followerTrend,
        },
        timeAnalytics: {
          hourlyEngagement,
          dailyEngagement,
        },
        trafficSources: analyticsData.trafficSources || [],
        deviceAnalytics: analyticsData.deviceAnalytics || [],
        conversionFunnel: analyticsData.conversionFunnel || { views: 0, engagements: 0, interested: 0, committed: 0 },
        engagementAnalysis: analyticsData.engagementAnalysis || { byType: {}, avgActionsPerUser: 0, totalUniqueUsers: 0 },
        rsvpAnalytics: analyticsData.rsvpAnalytics || { statusBreakdown: {}, reservationStats: { total: 0, avgPartySize: 0, byStatus: {} }, bookingTimeline: [] },
        followerGrowthDetailed: analyticsData.followerGrowthDetailed || { timeline: [], churnRate: 0, bySource: {}, netGrowth: 0 },
      };

      return analytics;
    },
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000, // 5 minutes - cached for performance
  });
}
