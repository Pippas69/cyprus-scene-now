import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface GhostOriginContext {
  eventTitle: string | null;
  date: string | null;
}

/**
 * Fetches the origin context of a ghost CRM guest:
 * - The event title from the first reservation or ticket that created them
 * - The date they were first seen
 */
export function useGhostOriginContext(
  guestName: string | null,
  businessId: string | null,
  isGhost: boolean
) {
  return useQuery({
    queryKey: ["ghost-origin", guestName, businessId],
    enabled: !!guestName && !!businessId && isGhost,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<GhostOriginContext> => {
      if (!guestName || !businessId) return { eventTitle: null, date: null };

      // Try reservation_guests first (most common ghost source)
      const { data: resGuest } = await supabase
        .from("reservation_guests")
        .select("created_at, reservation_id")
        .ilike("guest_name", guestName)
        .order("created_at", { ascending: true })
        .limit(5);

      if (resGuest && resGuest.length > 0) {
        // Find the reservation + event
        for (const rg of resGuest) {
          const { data: res } = await supabase
            .from("reservations")
            .select("event_id, preferred_time, business_id")
            .eq("id", rg.reservation_id)
            .single();
          
          if (res?.business_id === businessId || res?.event_id) {
            let eventTitle: string | null = null;
            if (res.event_id) {
              const { data: evt } = await supabase
                .from("events")
                .select("title")
                .eq("id", res.event_id)
                .single();
              eventTitle = evt?.title || null;
            }
            return {
              eventTitle,
              date: rg.created_at || res.preferred_time || null,
            };
          }
        }
      }

      // Try tickets (ghost created from ticket purchase)
      const { data: ticket } = await supabase
        .from("tickets")
        .select("created_at, event_id")
        .ilike("guest_name", guestName)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (ticket?.event_id) {
        const { data: evt } = await supabase
          .from("events")
          .select("title, business_id")
          .eq("id", ticket.event_id)
          .single();
        
        if (evt?.business_id === businessId) {
          return {
            eventTitle: evt.title,
            date: ticket.created_at,
          };
        }
      }

      return { eventTitle: null, date: null };
    },
  });
}
