import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProfileMetrics {
  newCustomers: number;
  paidStartedAt: string | null;
}

interface OfferBoostMetrics {
  boostSpentCents: number;
  totalVisits: number;
  uniqueVisitors: number;
  costPerCustomer: number;
}

interface EventBoostMetrics {
  boostSpentCents: number;
  revenueWithCommissionCents: number;
  netRevenueCents: number;
  commissionPercent: number;
}

export interface GuidanceMetrics {
  profile: ProfileMetrics;
  offers: OfferBoostMetrics;
  events: EventBoostMetrics;
}

interface DateRange {
  from: Date;
  to: Date;
}

export const useGuidanceMetrics = (businessId: string, dateRange?: DateRange) => {
  return useQuery<GuidanceMetrics>({
    queryKey: ["guidance-metrics", businessId, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      // Date range for filtering (default: last 30 days)
      const startDate = dateRange?.from?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = dateRange?.to?.toISOString() || new Date().toISOString();
      // ========================================
      // 1. PROFILE METRICS - New customers since FIRST paid plan start
      // ========================================

      // Current paid_started_at (kept for UI state like “has paid plan”)
      const { data: subscription } = await supabase
        .from("business_subscriptions")
        .select("paid_started_at, plan_id, status")
        .eq("business_id", businessId)
        .maybeSingle();

      // paid_started_at is set when business upgrades to paid plan (basic/pro/elite)
      // and reset to NULL when downgrading to free. This is managed by a DB trigger.
      const paidStartedAt = subscription?.paid_started_at || null;

      let newCustomers = 0;

      // Accurate attribution: count ONLY visits that happened while the plan
      // was paid at that exact moment (supports multiple paid/free periods).
      const paidSlugs = new Set(["basic", "pro", "elite"]);

      const { data: planHistory } = await supabase
        .from("business_subscription_plan_history")
        .select("plan_slug, valid_from, valid_to")
        .eq("business_id", businessId)
        .order("valid_from", { ascending: true });

      const paidIntervals = (planHistory || [])
        .filter((h) => paidSlugs.has(h.plan_slug))
        .map((h) => ({
          // IMPORTANT: avoid boundary double-counting when intervals touch.
          // For closed intervals we treat as half-open [from, to) by using < to.
          from: new Date(h.valid_from).toISOString(),
          to: new Date(h.valid_to || new Date().toISOString()).toISOString(),
          endInclusive: h.valid_to == null,
        }))
        .filter((i) => new Date(i.from) <= new Date(i.to));

      for (const interval of paidIntervals) {
        let reservationsQ = supabase
          .from("reservations")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .is("event_id", null)
          .not("checked_in_at", "is", null)
          .gte("checked_in_at", interval.from);

        reservationsQ = interval.endInclusive
          ? reservationsQ.lte("checked_in_at", interval.to)
          : reservationsQ.lt("checked_in_at", interval.to);

        const { count } = await reservationsQ;

        let studentQ = supabase
          .from("student_discount_redemptions")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .gte("created_at", interval.from);

        studentQ = interval.endInclusive
          ? studentQ.lte("created_at", interval.to)
          : studentQ.lt("created_at", interval.to);

        const { count: studentCount } = await studentQ;

        newCustomers += (count || 0) + (studentCount || 0);
      }


      // ========================================
      // 2. OFFER BOOST METRICS
      // ========================================
      
      // Get total boost spending for offers
      const { data: offerBoosts } = await supabase
        .from("offer_boosts")
        .select("total_cost_cents, discount_id, start_date, end_date, status, created_at")
        .eq("business_id", businessId)
        .in("status", ["active", "completed", "paused"]);

      const boostSpentCents = (offerBoosts || []).reduce(
        (sum, b) => sum + (b.total_cost_cents || 0),
        0
      );

      // Build boost periods for accurate attribution
      interface BoostPeriod {
        discountId: string;
        startDate: string;
        endDate: string;
      }
      
      const offerBoostPeriods: BoostPeriod[] = (offerBoosts || []).map((b) => ({
        discountId: b.discount_id,
        startDate: b.start_date,
        endDate: b.end_date,
      }));

      const isWithinOfferBoostPeriod = (
        timestamp: string,
        discountId: string
      ): boolean => {
        const date = new Date(timestamp);
        return offerBoostPeriods.some(
          (period) =>
            period.discountId === discountId &&
            date >= new Date(period.startDate) &&
            date <= new Date(period.endDate + "T23:59:59.999Z")
        );
      };

      // Get all boosted offer IDs
      const boostedOfferIds = [...new Set((offerBoosts || []).map((b) => b.discount_id))];

      let offerTotalVisits = 0;
      let offerUniqueVisitors = 0;

      if (boostedOfferIds.length > 0) {
        // Count QR redemptions (offer_purchases with redeemed_at) that occurred during boost periods
        // Also filter by the selected date range
        const { data: offerRedemptions } = await supabase
          .from("offer_purchases")
          .select("id, user_id, discount_id, redeemed_at")
          .in("discount_id", boostedOfferIds)
          .not("redeemed_at", "is", null)
          .gte("redeemed_at", startDate)
          .lte("redeemed_at", endDate);

        // Filter to only count redemptions that happened during a boost period
        const boostedRedemptions = (offerRedemptions || []).filter(
          (r) => r.redeemed_at && isWithinOfferBoostPeriod(r.redeemed_at, r.discount_id)
        );

        offerTotalVisits = boostedRedemptions.length;

        // Count unique visitors
        const uniqueOfferVisitors = new Set(
          boostedRedemptions.filter((r) => r.user_id).map((r) => r.user_id)
        );
        offerUniqueVisitors = uniqueOfferVisitors.size;
      }

      const costPerCustomer =
        offerUniqueVisitors > 0 ? boostSpentCents / offerUniqueVisitors : 0;

      // ========================================
      // 3. EVENT BOOST METRICS (only paid events with check-ins during boost period)
      // ========================================
      
       // Get event boosts that actually ran (active/completed)
       const { data: eventBoosts } = await supabase
         .from("event_boosts")
         .select("total_cost_cents, event_id, start_date, end_date, status")
         .eq("business_id", businessId)
         .in("status", ["active", "completed"]);

      const eventBoostSpentCents = (eventBoosts || []).reduce(
        (sum, b) => sum + (b.total_cost_cents || 0),
        0
      );

      // Build event boost periods for accurate attribution
      interface EventBoostPeriod {
        eventId: string;
        startDate: string;
        endDate: string;
      }
      
      const eventBoostPeriods: EventBoostPeriod[] = (eventBoosts || []).map((b) => ({
        eventId: b.event_id,
        startDate: b.start_date,
        endDate: b.end_date,
      }));

      const isWithinEventBoostPeriod = (
        timestamp: string,
        eventId: string
      ): boolean => {
        const date = new Date(timestamp);
        return eventBoostPeriods.some(
          (period) =>
            period.eventId === eventId &&
            date >= new Date(period.startDate) &&
            date <= new Date(period.endDate + "T23:59:59.999Z")
        );
      };

      const boostedEventIds = [...new Set((eventBoosts || []).map((b) => b.event_id))];

      let eventRevenueWithCommission = 0;
      let eventNetRevenue = 0;
      let avgCommissionPercent = 12; // Default commission

      if (boostedEventIds.length > 0) {
        // Get business commission rate first
        const { data: subscriptionData } = await supabase
          .from("business_subscriptions")
          .select("plan_id")
          .eq("business_id", businessId)
          .eq("status", "active")
          .maybeSingle();

        let reservationCommissionPercent = 12;
        if (subscriptionData?.plan_id) {
          const { data: planData } = await supabase
            .from("subscription_plans")
            .select("slug")
            .eq("id", subscriptionData.plan_id)
            .maybeSingle();

          // Commission rates by plan
          const commissionRates: Record<string, number> = {
            free: 12,
            basic: 10,
            pro: 8,
            elite: 6,
          };
          reservationCommissionPercent =
            commissionRates[planData?.slug || "free"] || 12;
        }

        // Get tickets with check-ins during boost periods (filtered by date range)
        const { data: tickets } = await supabase
          .from("tickets")
          .select("id, event_id, order_id, checked_in_at")
          .in("event_id", boostedEventIds)
          .not("checked_in_at", "is", null)
          .gte("checked_in_at", startDate)
          .lte("checked_in_at", endDate);

        // Filter tickets to only those checked in during boost period
        const boostedTickets = (tickets || []).filter(
          (t) => t.checked_in_at && isWithinEventBoostPeriod(t.checked_in_at, t.event_id)
        );

        // Get unique ticket order IDs from boosted check-ins
        const boostedOrderIds = [...new Set(boostedTickets.map((t) => t.order_id).filter(Boolean))];

        let ticketRevenue = 0;
        let ticketCommission = 0;

        if (boostedOrderIds.length > 0) {
          const { data: ticketOrders } = await supabase
            .from("ticket_orders")
            .select("id, total_cents, commission_cents")
            .in("id", boostedOrderIds)
            .eq("status", "completed");

          ticketRevenue = (ticketOrders || []).reduce(
            (sum, o) => sum + (o.total_cents || 0),
            0
          );
          ticketCommission = (ticketOrders || []).reduce(
            (sum, o) => sum + (o.commission_cents || 0),
            0
          );
        }

        // Get paid reservations with check-ins during boost periods (filtered by date range)
        const { data: paidReservations } = await supabase
          .from("reservations")
          .select("prepaid_min_charge_cents, event_id, checked_in_at")
          .in("event_id", boostedEventIds)
          .eq("prepaid_charge_status", "paid")
          .not("prepaid_min_charge_cents", "is", null)
          .not("checked_in_at", "is", null)
          .gte("checked_in_at", startDate)
          .lte("checked_in_at", endDate);

        // Filter reservations to only those checked in during boost period
        const boostedReservations = (paidReservations || []).filter(
          (r) => r.event_id && r.checked_in_at && isWithinEventBoostPeriod(r.checked_in_at, r.event_id)
        );

        // Calculate reservation revenue from boosted check-ins only
        const reservationRevenue = boostedReservations.reduce(
          (sum, r) => sum + (r.prepaid_min_charge_cents || 0),
          0
        );
        const reservationCommission = Math.round(
          reservationRevenue * (reservationCommissionPercent / 100)
        );

        // Total revenue WITH commission (what user paid)
        eventRevenueWithCommission = ticketRevenue + reservationRevenue;

        // Net revenue (after FOMO commission)
        eventNetRevenue =
          ticketRevenue -
          ticketCommission +
          (reservationRevenue - reservationCommission);

        // Average commission percent
        const totalCommission = ticketCommission + reservationCommission;
        avgCommissionPercent =
          eventRevenueWithCommission > 0
            ? Math.round((totalCommission / eventRevenueWithCommission) * 100)
            : reservationCommissionPercent;
      }

      return {
        profile: {
          newCustomers,
          paidStartedAt,
        },
        offers: {
          boostSpentCents,
          totalVisits: offerTotalVisits,
          uniqueVisitors: offerUniqueVisitors,
          costPerCustomer,
        },
        events: {
          boostSpentCents: eventBoostSpentCents,
          revenueWithCommissionCents: eventRevenueWithCommission,
          netRevenueCents: eventNetRevenue,
          commissionPercent: avgCommissionPercent,
        },
      };
    },
    enabled: !!businessId,
    // Guidance should update quickly after subscription changes.
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
  });
};
