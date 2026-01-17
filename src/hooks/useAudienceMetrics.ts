import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AudienceMetrics {
  gender: { male: number; female: number; other: number };
  age: Record<string, number>;
  region: Record<string, number>;
}

export const useAudienceMetrics = (businessId: string, dateRange?: { from: Date; to: Date }) => {
  return useQuery({
    queryKey: ["audience-metrics", businessId, dateRange?.from, dateRange?.to],
    queryFn: async (): Promise<AudienceMetrics> => {
      const startDate = dateRange?.from || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const endDate = dateRange?.to || new Date();

      // Get all events for this business
      const { data: events } = await supabase
        .from("events")
        .select("id")
        .eq("business_id", businessId);
      const eventIds = events?.map(e => e.id) || [];

      // Get all discounts for this business
      const { data: discounts } = await supabase
        .from("discounts")
        .select("id")
        .eq("business_id", businessId);
      const discountIds = discounts?.map(d => d.id) || [];

      // Collect ALL user IDs from all engagement sources
      const userIdSet = new Set<string>();

      // 1. Event views (users who viewed events)
      if (eventIds.length > 0) {
        const { data: eventViewUsers } = await supabase
          .from("event_views")
          .select("user_id")
          .in("event_id", eventIds)
          .gte("viewed_at", startDate.toISOString())
          .lte("viewed_at", endDate.toISOString())
          .not("user_id", "is", null);
        eventViewUsers?.forEach(v => v.user_id && userIdSet.add(v.user_id));
      }

      // 2. Discount views (users who viewed offers)
      if (discountIds.length > 0) {
        const { data: discountViewUsers } = await supabase
          .from("discount_views")
          .select("user_id")
          .in("discount_id", discountIds)
          .gte("viewed_at", startDate.toISOString())
          .lte("viewed_at", endDate.toISOString())
          .not("user_id", "is", null);
        discountViewUsers?.forEach(v => v.user_id && userIdSet.add(v.user_id));
      }

      // 3. RSVPs (users who RSVPed to events)
      if (eventIds.length > 0) {
        const { data: rsvpUsers } = await supabase
          .from("rsvps")
          .select("user_id")
          .in("event_id", eventIds)
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());
        rsvpUsers?.forEach(r => r.user_id && userIdSet.add(r.user_id));
      }

      // 4. Reservations (both event-linked and direct business reservations)
      const { data: reservationUsers } = await supabase
        .from("reservations")
        .select("user_id")
        .or(`business_id.eq.${businessId}${eventIds.length > 0 ? `,event_id.in.(${eventIds.join(',')})` : ''}`)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());
      reservationUsers?.forEach(r => r.user_id && userIdSet.add(r.user_id));

      // 5. Ticket orders (users who bought tickets)
      const { data: ticketUsers } = await supabase
        .from("ticket_orders")
        .select("user_id")
        .eq("business_id", businessId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());
      ticketUsers?.forEach(t => t.user_id && userIdSet.add(t.user_id));

      // 6. Business followers
      const { data: followerUsers } = await supabase
        .from("business_followers")
        .select("user_id")
        .eq("business_id", businessId)
        .is("unfollowed_at", null);
      followerUsers?.forEach(f => f.user_id && userIdSet.add(f.user_id));

      // 7. Engagement events (profile visits, shares, etc.)
      const { data: engagementUsers } = await supabase
        .from("engagement_events")
        .select("user_id")
        .eq("business_id", businessId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .not("user_id", "is", null);
      engagementUsers?.forEach(e => e.user_id && userIdSet.add(e.user_id));

      const userIds = Array.from(userIdSet);

      if (userIds.length === 0) {
        return {
          gender: { male: 0, female: 0, other: 0 },
          age: { "18-24": 0, "25-34": 0, "35-44": 0, "45-54": 0, "55+": 0 },
          region: {},
        };
      }

      // Fetch profiles with gender, age, city/town from signup data
      const { data: profiles } = await supabase
        .from("profiles")
        .select("gender, age, dob_year, city, town")
        .in("id", userIds);

      // Calculate metrics
      const genderCount = { male: 0, female: 0, other: 0 };
      const ageCount: Record<string, number> = { "18-24": 0, "25-34": 0, "35-44": 0, "45-54": 0, "55+": 0 };
      const regionCount: Record<string, number> = {};

      const currentYear = new Date().getFullYear();

      profiles?.forEach(profile => {
        // Gender from signup - handle various formats
        const gender = profile.gender?.toLowerCase()?.trim();
        if (gender === "male" || gender === "m" || gender === "άνδρας" || gender === "αρσενικό") {
          genderCount.male++;
        } else if (gender === "female" || gender === "f" || gender === "γυναίκα" || gender === "θηλυκό") {
          genderCount.female++;
        } else if (gender && gender !== "" && gender !== "null" && gender !== "undefined") {
          genderCount.other++;
        }

        // Age from signup (either direct age field or calculated from dob_year)
        let age = typeof profile.age === 'number' ? profile.age : null;
        if (!age && profile.dob_year && typeof profile.dob_year === 'number') {
          age = currentYear - profile.dob_year;
        }
        
        if (age && age >= 18) {
          if (age <= 24) ageCount["18-24"]++;
          else if (age <= 34) ageCount["25-34"]++;
          else if (age <= 44) ageCount["35-44"]++;
          else if (age <= 54) ageCount["45-54"]++;
          else ageCount["55+"]++;
        }

        // Region from signup (prefer city, fallback to town)
        const location = (profile.city || profile.town)?.trim();
        if (location && location !== "" && location !== "null") {
          regionCount[location] = (regionCount[location] || 0) + 1;
        }
      });

      return {
        gender: genderCount,
        age: ageCount,
        region: regionCount,
      };
    },
    enabled: !!businessId,
  });
};
