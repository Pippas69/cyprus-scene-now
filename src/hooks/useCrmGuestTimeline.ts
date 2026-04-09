import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TimelineActivity {
  activity_type: string;
  title: string;
  activity_date: string;
  booked_at: string;
  checked_in_at: string | null;
  spend_cents: number;
}

export function useCrmGuestTimeline(guestId: string | null, businessId: string | null) {
  return useQuery({
    queryKey: ["crm-guest-timeline", guestId, businessId],
    enabled: !!guestId && !!businessId,
    queryFn: async () => {
      if (!guestId || !businessId) return [];
      const { data, error } = await supabase.rpc("get_crm_guest_timeline", {
        p_business_id: businessId,
        p_guest_id: guestId,
      });
      if (error) throw error;
      return (data || []) as TimelineActivity[];
    },
  });
}
