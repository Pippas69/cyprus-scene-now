import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProfileMetrics {
  newCustomers: number;
  paidPlanStartDate: string | null;
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

export const useGuidanceMetrics = (businessId: string) => {
  return useQuery<GuidanceMetrics>({
    queryKey: ["guidance-metrics", businessId],
    queryFn: async () => {
      // ========================================
      // 1. PROFILE METRICS - New customers since FIRST paid plan start
      // ========================================

      // Fetch all subscription rows for this business and find the earliest start
      // for any paid plan (basic/pro/elite). This matches the requirement:
      // "από την ημέρα που η επιχείρηση μπήκε σε paid plan".
      const { data: subscriptions } = await supabase
        .from("business_subscriptions")
        .select("current_period_start, plan_id, status")
        .eq("business_id", businessId);

      const planIds = Array.from(
        new Set((subscriptions || []).map((s) => s.plan_id).filter(Boolean))
      ) as string[];

      const { data: plans } = planIds.length
        ? await supabase
            .from("subscription_plans")
            .select("id, slug")
            .in("id", planIds)
        : { data: [] as { id: string; slug: string | null }[] };

      const slugByPlanId = new Map((plans || []).map((p) => [p.id, p.slug]));

      const paidStartDates = (subscriptions || [])
        .filter((s) => {
          const slug = s.plan_id ? slugByPlanId.get(s.plan_id) : null;
          return !!slug && slug !== "free" && !!s.current_period_start;
        })
        .map((s) => new Date(s.current_period_start).getTime());

      const paidPlanStartDate =
        paidStartDates.length > 0
          ? new Date(Math.min(...paidStartDates)).toISOString()
          : null;

      let newCustomers = 0;

      if (paidPlanStartDate) {
        // Count unique visitors (QR check-ins) from direct profile reservations
        // since the paid plan started.
        // reservation_scans does not have business_id; join via reservations.
        const { data: reservationScans } = await (supabase
          .from("reservation_scans") as any)
          .select(
            "scanned_by, reservation:reservations!inner(event_id, business_id)"
          )
          .eq("reservation.business_id", businessId)
          .is("reservation.event_id", null)
          .eq("success", true)
          .gte("scanned_at", paidPlanStartDate);

        const uniqueUsers = new Set(
          (reservationScans || [])
            .filter((s: any) => s.scanned_by)
            .map((s: any) => s.scanned_by)
        );

        newCustomers = uniqueUsers.size;
      }


      // ========================================
      // 2. OFFER BOOST METRICS
      // ========================================
      
      // Get total boost spending for offers
      const { data: offerBoosts } = await supabase
        .from("offer_boosts")
        .select("total_cost_cents, discount_id, start_date, end_date, status")
        .eq("business_id", businessId)
        .in("status", ["active", "completed"]);

      const boostSpentCents = (offerBoosts || []).reduce(
        (sum, b) => sum + (b.total_cost_cents || 0),
        0
      );

      // Get all boosted offer IDs
      const boostedOfferIds = (offerBoosts || []).map((b) => b.discount_id);

      let offerTotalVisits = 0;
      let offerUniqueVisitors = 0;

      if (boostedOfferIds.length > 0) {
        // Count all QR scans for boosted offers (visits to venue)
        const { data: offerScans } = await supabase
          .from("discount_scans")
          .select("id, scanned_by")
          .in("discount_id", boostedOfferIds)
          .eq("success", true);

        offerTotalVisits = offerScans?.length || 0;

        // Count unique visitors
        const uniqueOfferVisitors = new Set(
          (offerScans || [])
            .filter((s) => s.scanned_by)
            .map((s) => s.scanned_by)
        );
        offerUniqueVisitors = uniqueOfferVisitors.size;
      }

      const costPerCustomer =
        offerUniqueVisitors > 0 ? boostSpentCents / offerUniqueVisitors : 0;

      // ========================================
      // 3. EVENT BOOST METRICS (only paid events)
      // ========================================
      
      // Get all event boosts
      const { data: eventBoosts } = await supabase
        .from("event_boosts")
        .select("total_cost_cents, event_id, start_date, end_date, status")
        .eq("business_id", businessId)
        .in("status", ["active", "completed"]);

      const eventBoostSpentCents = (eventBoosts || []).reduce(
        (sum, b) => sum + (b.total_cost_cents || 0),
        0
      );

      const boostedEventIds = (eventBoosts || []).map((b) => b.event_id);

      let eventRevenueWithCommission = 0;
      let eventNetRevenue = 0;
      let avgCommissionPercent = 12; // Default commission

      if (boostedEventIds.length > 0) {
        // Get PAID ticket orders for boosted events
        const { data: ticketOrders } = await supabase
          .from("ticket_orders")
          .select("total_cents, commission_cents, commission_percent")
          .in("event_id", boostedEventIds)
          .eq("status", "completed");

        // Get PAID reservations (with prepaid min charge) for boosted events
        const { data: paidReservations } = await supabase
          .from("reservations")
          .select("prepaid_min_charge_cents, event_id")
          .in("event_id", boostedEventIds)
          .eq("prepaid_charge_status", "paid")
          .not("prepaid_min_charge_cents", "is", null);

        // Calculate ticket revenue
        const ticketRevenue = (ticketOrders || []).reduce(
          (sum, o) => sum + (o.total_cents || 0),
          0
        );
        const ticketCommission = (ticketOrders || []).reduce(
          (sum, o) => sum + (o.commission_cents || 0),
          0
        );

        // Get business commission rate for reservations
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

        // Calculate reservation revenue
        const reservationRevenue = (paidReservations || []).reduce(
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
        if (ticketOrders?.length) {
          const totalCommission = ticketCommission + reservationCommission;
          const totalRevenue = eventRevenueWithCommission;
          avgCommissionPercent =
            totalRevenue > 0
              ? Math.round((totalCommission / totalRevenue) * 100)
              : reservationCommissionPercent;
        } else {
          avgCommissionPercent = reservationCommissionPercent;
        }
      }

      return {
        profile: {
          newCustomers,
          paidPlanStartDate,
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
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
