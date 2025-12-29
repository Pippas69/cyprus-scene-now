import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BoostAnalyticsData {
  id: string;
  boost_id: string;
  event_id: string;
  date: string;
  impressions: number;
  clicks: number;
  rsvps_interested: number;
  rsvps_going: number;
  unique_viewers: number;
}

interface BoostPerformanceSummary {
  totalImpressions: number;
  totalClicks: number;
  totalRsvpsInterested: number;
  totalRsvpsGoing: number;
  totalConversions: number;
  uniqueViewers: number;
  ctr: number;
  conversionRate: number;
  costPerClick: number;
  costPerConversion: number;
  dailyData: BoostAnalyticsData[];
}

interface BoostWithDetails {
  id: string;
  event_id: string;
  business_id: string;
  boost_tier: string;
  daily_rate_cents: number;
  start_date: string;
  end_date: string;
  status: string;
  total_cost_cents: number;
  targeting_quality: number | null;
  events?: {
    title: string;
    cover_image_url: string | null;
  };
}

export function useBoostAnalytics(boostId: string | null) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<BoostPerformanceSummary | null>(null);
  const [boost, setBoost] = useState<BoostWithDetails | null>(null);

  useEffect(() => {
    if (!boostId) {
      setLoading(false);
      return;
    }

    fetchBoostAnalytics();
  }, [boostId]);

  const fetchBoostAnalytics = async () => {
    if (!boostId) return;
    
    setLoading(true);
    setError(null);

    try {
      // Fetch boost details
      const { data: boostData, error: boostError } = await supabase
        .from('event_boosts')
        .select(`
          *,
          events (
            title,
            cover_image_url
          )
        `)
        .eq('id', boostId)
        .single();

      if (boostError) throw boostError;
      setBoost(boostData);

      // Fetch analytics data
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('boost_analytics')
        .select('*')
        .eq('boost_id', boostId)
        .order('date', { ascending: true });

      if (analyticsError) throw analyticsError;

      // Calculate summary
      const dailyData = analyticsData || [];
      const totalImpressions = dailyData.reduce((sum, d) => sum + d.impressions, 0);
      const totalClicks = dailyData.reduce((sum, d) => sum + d.clicks, 0);
      const totalRsvpsInterested = dailyData.reduce((sum, d) => sum + d.rsvps_interested, 0);
      const totalRsvpsGoing = dailyData.reduce((sum, d) => sum + d.rsvps_going, 0);
      const totalConversions = totalRsvpsInterested + totalRsvpsGoing;
      const uniqueViewers = dailyData.reduce((sum, d) => sum + d.unique_viewers, 0);

      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
      
      const totalCostCents = boostData?.total_cost_cents || 0;
      const costPerClick = totalClicks > 0 ? totalCostCents / totalClicks / 100 : 0;
      const costPerConversion = totalConversions > 0 ? totalCostCents / totalConversions / 100 : 0;

      setSummary({
        totalImpressions,
        totalClicks,
        totalRsvpsInterested,
        totalRsvpsGoing,
        totalConversions,
        uniqueViewers,
        ctr,
        conversionRate,
        costPerClick,
        costPerConversion,
        dailyData,
      });
    } catch (err) {
      console.error('Error fetching boost analytics:', err);
      setError('Failed to load boost analytics');
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    summary,
    boost,
    refetch: fetchBoostAnalytics,
  };
}

// Hook to get quick stats for multiple boosts
export function useBoostsQuickStats(boostIds: string[]) {
  const [stats, setStats] = useState<Record<string, { impressions: number; clicks: number; conversions: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (boostIds.length === 0) {
      setLoading(false);
      return;
    }

    fetchQuickStats();
  }, [boostIds.join(',')]);

  const fetchQuickStats = async () => {
    try {
      const { data, error } = await supabase
        .from('boost_analytics')
        .select('boost_id, impressions, clicks, rsvps_interested, rsvps_going')
        .in('boost_id', boostIds);

      if (error) throw error;

      // Aggregate by boost_id
      const aggregated: Record<string, { impressions: number; clicks: number; conversions: number }> = {};
      
      for (const row of data || []) {
        if (!aggregated[row.boost_id]) {
          aggregated[row.boost_id] = { impressions: 0, clicks: 0, conversions: 0 };
        }
        aggregated[row.boost_id].impressions += row.impressions;
        aggregated[row.boost_id].clicks += row.clicks;
        aggregated[row.boost_id].conversions += row.rsvps_interested + row.rsvps_going;
      }

      setStats(aggregated);
    } catch (err) {
      console.error('Error fetching quick stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading };
}

// Hook to check if an event has an active boost
export function useEventActiveBoost(eventId: string | null) {
  const [activeBoost, setActiveBoost] = useState<BoostWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    fetchActiveBoost();
  }, [eventId]);

  const fetchActiveBoost = async () => {
    if (!eventId) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('event_boosts')
        .select('*')
        .eq('event_id', eventId)
        .eq('status', 'active')
        .lte('start_date', today)
        .gte('end_date', today)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setActiveBoost(data);
    } catch (err) {
      console.error('Error checking active boost:', err);
    } finally {
      setLoading(false);
    }
  };

  return { activeBoost, loading, refetch: fetchActiveBoost };
}
