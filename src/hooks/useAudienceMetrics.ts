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

      // Get events for this business
      const { data: events } = await supabase
        .from("events")
        .select("id")
        .eq("business_id", businessId);
      const eventIds = events?.map(e => e.id) || [];

      // Collect unique user IDs from reservations and ticket orders
      // Note: reservations can be linked via event_id OR direct business_id
      const { data: reservationUsers } = await supabase
        .from("reservations")
        .select("user_id")
        .or(`business_id.eq.${businessId}${eventIds.length > 0 ? `,event_id.in.(${eventIds.join(',')})` : ''}`)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      const { data: ticketUsers } = await supabase
        .from("ticket_orders")
        .select("user_id")
        .eq("business_id", businessId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      const userIds = [...new Set([
        ...(reservationUsers?.map(r => r.user_id) || []),
        ...(ticketUsers?.map(t => t.user_id) || [])
      ].filter(Boolean))];

      if (userIds.length === 0) {
        return {
          gender: { male: 0, female: 0, other: 0 },
          age: { "18-24": 0, "25-34": 0, "35-44": 0, "45-54": 0, "55+": 0 },
          region: {},
        };
      }

      // Fetch profiles for these users - use both id and user_id since some profiles have user_id = id
      // Also check if we should use 'id' column directly since in some cases profile.id = auth.user.id
      const { data: profilesById } = await supabase
        .from("profiles")
        .select("gender, age, dob_year, city, town")
        .in("id", userIds);

      // Combine results (profiles.id usually equals auth user id)
      const profiles = profilesById || [];

      // Calculate metrics
      const genderCount = { male: 0, female: 0, other: 0 };
      const ageCount: Record<string, number> = { "18-24": 0, "25-34": 0, "35-44": 0, "45-54": 0, "55+": 0 };
      const regionCount: Record<string, number> = {};

      const currentYear = new Date().getFullYear();

      profiles?.forEach(profile => {
        // Gender
        const gender = profile.gender?.toLowerCase();
        if (gender === "male" || gender === "m") genderCount.male++;
        else if (gender === "female" || gender === "f") genderCount.female++;
        else if (gender) genderCount.other++;

        // Age
        let age = profile.age;
        if (!age && profile.dob_year) {
          age = currentYear - profile.dob_year;
        }
        if (age) {
          if (age >= 18 && age <= 24) ageCount["18-24"]++;
          else if (age >= 25 && age <= 34) ageCount["25-34"]++;
          else if (age >= 35 && age <= 44) ageCount["35-44"]++;
          else if (age >= 45 && age <= 54) ageCount["45-54"]++;
          else if (age >= 55) ageCount["55+"]++;
        }

        // Region (prefer city, fallback to town)
        const location = profile.city || profile.town;
        if (location) {
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
