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

      // "Audience" here means VERIFIED visitors only (QR check-ins / redemptions)
      // and is intentionally aligned with the "Visits" definition in Overview/Performance.

      // Get all events for this business (needed for ticket check-ins)
      const { data: events } = await supabase
        .from("events")
        .select("id")
        .eq("business_id", businessId);
      const eventIds = events?.map((e) => e.id) || [];

      // We aggregate demographics by VISIT count (not unique users).
      // If the same person visits twice, they should count twice.
      const visitsByUserId: Record<string, number> = {};

      const addVisit = (userId: string | null | undefined) => {
        if (!userId) return;
        visitsByUserId[userId] = (visitsByUserId[userId] || 0) + 1;
      };

      // A) Offer visits = redeemed offers (offer_purchases.redeemed_at)
      // (More reliable than discount_scans because it includes user_id.)
      const { data: redeemedOffers } = await supabase
        .from("offer_purchases")
        .select("user_id")
        .eq("business_id", businessId)
        .not("redeemed_at", "is", null)
        .gte("redeemed_at", startDate.toISOString())
        .lte("redeemed_at", endDate.toISOString());
      redeemedOffers?.forEach((r) => addVisit(r.user_id));

      // B) Reservation visits = checked-in reservations (reservations.checked_in_at)
      // Includes both direct reservations + event-linked reservations.
      const { data: checkedInReservations } = await supabase
        .from("reservations")
        .select("user_id")
        .eq("business_id", businessId)
        .not("checked_in_at", "is", null)
        .gte("checked_in_at", startDate.toISOString())
        .lte("checked_in_at", endDate.toISOString());
      checkedInReservations?.forEach((r) => addVisit(r.user_id));

      // C) Event visits = ticket check-ins (tickets.checked_in_at)
      if (eventIds.length > 0) {
        const { data: checkedInTickets } = await supabase
          .from("tickets")
          .select("user_id")
          .in("event_id", eventIds)
          .not("checked_in_at", "is", null)
          .gte("checked_in_at", startDate.toISOString())
          .lte("checked_in_at", endDate.toISOString());
        checkedInTickets?.forEach((t) => addVisit(t.user_id));
      }

      const userIds = Object.keys(visitsByUserId);

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
        .select("id, gender, age, dob_year, city, town")
        .in("id", userIds);

      // Calculate metrics (weighted by visit count)
      const genderCount = { male: 0, female: 0, other: 0 };
      const ageCount: Record<string, number> = { "18-24": 0, "25-34": 0, "35-44": 0, "45-54": 0, "55+": 0 };
      const regionCount: Record<string, number> = {};

      const currentYear = new Date().getFullYear();

      profiles?.forEach((profile) => {
        const weight = visitsByUserId[profile.id] || 0;
        if (weight <= 0) return;

        // Gender from signup - handle various formats
        const gender = profile.gender?.toLowerCase()?.trim();
        if (gender === "male" || gender === "m" || gender === "άνδρας" || gender === "αρσενικό") {
          genderCount.male += weight;
        } else if (gender === "female" || gender === "f" || gender === "γυναίκα" || gender === "θηλυκό") {
          genderCount.female += weight;
        } else if (gender && gender !== "" && gender !== "null" && gender !== "undefined") {
          genderCount.other += weight;
        }

        // Age from signup (either direct age field or calculated from dob_year)
        let age = typeof profile.age === "number" ? profile.age : null;
        if (!age && profile.dob_year && typeof profile.dob_year === "number") {
          age = currentYear - profile.dob_year;
        }

        if (age && age >= 18) {
          if (age <= 24) ageCount["18-24"] += weight;
          else if (age <= 34) ageCount["25-34"] += weight;
          else if (age <= 44) ageCount["35-44"] += weight;
          else if (age <= 54) ageCount["45-54"] += weight;
          else ageCount["55+"] += weight;
        }

        // Region from signup (prefer city, fallback to town)
        const location = (profile.city || profile.town)?.trim();
        if (location && location !== "" && location !== "null") {
          regionCount[location] = (regionCount[location] || 0) + weight;
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
