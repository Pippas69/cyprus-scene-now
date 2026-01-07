import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';

export interface FOMOImpactData {
  // Spending
  subscriptionCost: number;
  boostSpending: number;
  totalSpent: number;
  
  // Earnings
  ticketRevenue: number;
  offerRevenue: number;
  totalEarned: number;
  
  // Profit
  netProfit: number;
  roiPercentage: number;
  
  // Key metrics
  peopleReached: number;
  customersServed: number;
  followersCount: number;
  newFollowers: number;
  
  // Engagement
  interested: number;
  confirmed: number;
  showUpRate: number;
}

export function useFOMOImpact(businessId: string, dateRange?: DateRange) {
  return useQuery({
    queryKey: ['fomo-impact', businessId, dateRange],
    queryFn: async (): Promise<FOMOImpactData> => {
      if (!businessId) throw new Error('Business ID is required');

      const startDate = dateRange?.from || subDays(new Date(), 30);
      const endDate = dateRange?.to || new Date();

      // Get business events first
      const { data: events } = await supabase
        .from('events')
        .select('id')
        .eq('business_id', businessId);
      
      const eventIds = events?.map(e => e.id) || [];

      // Fetch all data in parallel
      const [
        subscriptionResult,
        eventBoostsResult,
        offerBoostsResult,
        ticketOrdersResult,
        offerPurchasesResult,
        followersResult,
        viewsResult,
        rsvpsResult,
        reservationsResult
      ] = await Promise.all([
        // Subscription cost
        supabase
          .from('business_subscriptions')
          .select('plan_id, subscription_plans(price_monthly_cents)')
          .eq('business_id', businessId)
          .maybeSingle(),
        
        // Event boosts spending in period
        supabase
          .from('event_boosts')
          .select('total_cost_cents')
          .eq('business_id', businessId)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        
        // Offer boosts spending in period
        supabase
          .from('offer_boosts')
          .select('total_cost_cents')
          .eq('business_id', businessId)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        
        // Ticket revenue (subtotal - commission = business payout)
        supabase
          .from('ticket_orders')
          .select('subtotal_cents, commission_cents')
          .eq('business_id', businessId)
          .eq('status', 'completed')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        
        // Offer revenue (business payout)
        supabase
          .from('offer_purchases')
          .select('business_payout_cents')
          .eq('business_id', businessId)
          .eq('status', 'paid')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        
        // Followers
        supabase
          .from('business_followers')
          .select('created_at, unfollowed_at')
          .eq('business_id', businessId),
        
        // Event views (people reached)
        eventIds.length > 0 
          ? supabase
              .from('event_views')
              .select('user_id, session_id')
              .gte('viewed_at', startDate.toISOString())
              .lte('viewed_at', endDate.toISOString())
              .in('event_id', eventIds)
          : Promise.resolve({ data: [] as { user_id: string | null; session_id: string | null }[] }),
        
        // RSVPs (interested and going)
        eventIds.length > 0
          ? supabase
              .from('rsvps')
              .select('status')
              .gte('created_at', startDate.toISOString())
              .lte('created_at', endDate.toISOString())
              .in('event_id', eventIds)
          : Promise.resolve({ data: [] as { status: string }[] }),
        
        // Accepted reservations (customers served)
        eventIds.length > 0
          ? supabase
              .from('reservations')
              .select('party_size')
              .eq('status', 'accepted')
              .gte('created_at', startDate.toISOString())
              .lte('created_at', endDate.toISOString())
              .in('event_id', eventIds)
          : Promise.resolve({ data: [] as { party_size: number }[] }),
      ]);

      // Calculate subscription cost (monthly, prorated to period)
      const subscriptionData = subscriptionResult.data as { subscription_plans?: { price_monthly_cents?: number } } | null;
      const monthlyPriceCents = subscriptionData?.subscription_plans?.price_monthly_cents || 0;
      const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const subscriptionCost = Math.round((monthlyPriceCents / 30) * periodDays) / 100;

      // Calculate boost spending
      const eventBoostTotal = eventBoostsResult.data?.reduce((sum, b) => sum + (b.total_cost_cents || 0), 0) || 0;
      const offerBoostTotal = offerBoostsResult.data?.reduce((sum, b) => sum + (b.total_cost_cents || 0), 0) || 0;
      const boostSpending = (eventBoostTotal + offerBoostTotal) / 100;

      const totalSpent = subscriptionCost + boostSpending;

      // Calculate ticket revenue (subtotal - commission)
      const ticketRevenue = (ticketOrdersResult.data?.reduce((sum, o) => {
        const subtotal = o.subtotal_cents || 0;
        const commission = o.commission_cents || 0;
        return sum + (subtotal - commission);
      }, 0) || 0) / 100;
      
      const offerRevenue = (offerPurchasesResult.data?.reduce((sum, o) => sum + (o.business_payout_cents || 0), 0) || 0) / 100;
      const totalEarned = ticketRevenue + offerRevenue;

      // Calculate profit and ROI
      const netProfit = totalEarned - totalSpent;
      const roiPercentage = totalSpent > 0 ? ((netProfit / totalSpent) * 100) : 0;

      // Calculate people reached (unique viewers)
      const viewsData = viewsResult.data || [];
      const uniqueViewers = new Set(
        viewsData.map(v => v.user_id || v.session_id).filter(Boolean)
      ).size;

      // Calculate customers served (ticket buyers + reservation guests)
      const ticketBuyers = ticketOrdersResult.data?.length || 0;
      const reservationsData = reservationsResult.data || [];
      const reservationGuests = reservationsData.reduce((sum, r) => sum + (r.party_size || 1), 0);
      const customersServed = ticketBuyers + reservationGuests;

      // Calculate followers
      const allFollowers = followersResult.data || [];
      const currentFollowers = allFollowers.filter(f => !f.unfollowed_at).length;
      const newFollowers = allFollowers.filter(f => 
        new Date(f.created_at) >= startDate && 
        new Date(f.created_at) <= endDate &&
        !f.unfollowed_at
      ).length;

      // Calculate RSVPs
      const rsvpsData = rsvpsResult.data || [];
      const interested = rsvpsData.filter(r => r.status === 'interested').length;
      const confirmed = rsvpsData.filter(r => r.status === 'going').length;

      // Calculate show-up rate (confirmed / interested)
      const showUpRate = interested > 0 ? (confirmed / interested) * 100 : 0;

      return {
        subscriptionCost,
        boostSpending,
        totalSpent,
        ticketRevenue,
        offerRevenue,
        totalEarned,
        netProfit,
        roiPercentage,
        peopleReached: uniqueViewers,
        customersServed,
        followersCount: currentFollowers,
        newFollowers,
        interested,
        confirmed,
        showUpRate
      };
    },
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  });
}
