import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AudienceMetrics {
  gender: { male: number; female: number; other: number };
  age: Record<string, number>;
  region: Record<string, number>;
}

export const useAudienceMetrics = (
  businessId: string,
  dateRange?: { from: Date; to: Date }
) => {
  return useQuery({
    queryKey: ["audience-metrics", businessId, dateRange?.from, dateRange?.to],
    queryFn: async (): Promise<AudienceMetrics> => {
      const startDate = dateRange?.from || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const endDate = dateRange?.to || new Date();

      // "Audience" = VERIFIED visits only (QR scans / check-ins)
      // Must match the same "Visits" definition used in Overview/Performance.

      // Get all events & offers for this business (for filtering scans)
      const [{ data: events }, { data: discounts }] = await Promise.all([
        supabase.from("events").select("id").eq("business_id", businessId),
        supabase.from("discounts").select("id").eq("business_id", businessId),
      ]);

      const eventIds = events?.map((e) => e.id) || [];
      const discountIds = discounts?.map((d) => d.id) || [];

      // We aggregate demographics by VISIT count (not unique users).
      // If the same person visits twice, they should count twice.
      const visitsByUserId: Record<string, number> = {};

      const addVisit = (userId: string | null | undefined) => {
        if (!userId) return;
        visitsByUserId[userId] = (visitsByUserId[userId] || 0) + 1;
      };

      // A) Offer visits = successful offer redemptions (customer-side)
      // IMPORTANT: discount_scans.scanned_by is the business staff member who scanned.
      // For demographics we must attribute visits to the CUSTOMER (offer_purchases.user_id).
      if (discountIds.length > 0) {
        const { data: redeemedPurchases } = await supabase
          .from("offer_purchases")
          .select("user_id")
          .in("discount_id", discountIds)
          .not("redeemed_at", "is", null)
          .gte("redeemed_at", startDate.toISOString())
          .lte("redeemed_at", endDate.toISOString());

        redeemedPurchases?.forEach((p) => addVisit(p.user_id));
      }

      // B) Reservation visits = reservation QR scans (direct + event-linked)
      // scanned_by is staff; the customer is reservations.user_id.
      const { data: reservationScans } = await (supabase
        .from("reservation_scans") as any)
        .select("reservation:reservations!inner(business_id,user_id)")
        .eq("reservation.business_id", businessId)
        .eq("success", true)
        .gte("scanned_at", startDate.toISOString())
        .lte("scanned_at", endDate.toISOString());

      (reservationScans || []).forEach((s: any) => addVisit(s?.reservation?.user_id));

      // C) Event visits = ticket check-ins (customer is tickets.user_id)
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
          age: { "18-24": 0, "25-34": 0, "35-44": 0, "45-54": 0, "55+": 0, "Άγνωστο": 0 },
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
      const ageCount: Record<string, number> = {
        "18-24": 0,
        "25-34": 0,
        "35-44": 0,
        "45-54": 0,
        "55+": 0,
        "Άγνωστο": 0,
      };
      const regionCount: Record<string, number> = {};

      const currentYear = new Date().getFullYear();

      profiles?.forEach((profile) => {
        const weight = visitsByUserId[profile.id] || 0;
        if (weight <= 0) return;

        // Gender from signup - handle various formats.
        // If missing, count as "other" so charts never stay empty when visits exist.
        const gender = profile.gender?.toLowerCase()?.trim();
        if (gender === "male" || gender === "m" || gender === "άνδρας" || gender === "αρσενικό") {
          genderCount.male += weight;
        } else if (gender === "female" || gender === "f" || gender === "γυναίκα" || gender === "θηλυκό") {
          genderCount.female += weight;
        } else {
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
        } else {
          ageCount["Άγνωστο"] += weight;
        }

        // Region from signup (prefer city, fallback to town)
        const location = (profile.city || profile.town)?.trim();
        const key = location && location !== "" && location !== "null" ? location : "Άγνωστο";
        regionCount[key] = (regionCount[key] || 0) + weight;
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

