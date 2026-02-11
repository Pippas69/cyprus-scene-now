import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from "date-fns";
import { doesCategoryMatchFilters } from "@/lib/categoryFilterMapping";

export interface EventLocation {
  id: string;
  title: string;
  description: string;
  start_at: string;
  end_at: string;
  location: string;
  category: string[];
  cover_image_url?: string;
  coordinates: [number, number];
  price?: number;
  accepts_reservations?: boolean;
  business?: {
    id: string;
    name: string;
    logo_url?: string;
    city: string;
  };
}

export const useMapEvents = (
  selectedCategories: string[],
  timeAccessFilters: string[] = []
) => {
  const [events, setEvents] = useState<EventLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from("events")
          .select(`
            id,
            title,
            description,
            start_at,
            end_at,
            location,
            category,
            cover_image_url,
            business_id,
            price,
            accepts_reservations,
            businesses (
              id,
              name,
              logo_url,
              city
            )
          `);

        const now = new Date();

        // Time filtering based on timeAccessFilters
        const hasLiveNow = timeAccessFilters.includes("live_now");
        const hasTonight = timeAccessFilters.includes("tonight");
        const hasMonFri = timeAccessFilters.includes("mon_fri");
        const hasWeekend = timeAccessFilters.includes("the_weekend");
        const hasThisMonth = timeAccessFilters.includes("this_month");

        // Determine date range based on filters
        if (hasLiveNow) {
          // Events happening right now
          query = query
            .lte('start_at', now.toISOString())
            .gte('end_at', now.toISOString());
        } else if (hasTonight) {
          // Events tonight (today after 6pm until midnight)
          const tonight6pm = new Date(now);
          tonight6pm.setHours(18, 0, 0, 0);
          const endOfTonight = endOfDay(now);
          query = query
            .gte('start_at', tonight6pm.toISOString())
            .lte('start_at', endOfTonight.toISOString());
        } else if (hasMonFri) {
          // Events Monday to Friday this week
          const weekStart = startOfWeek(now, { weekStartsOn: 1 });
          const friday = addDays(weekStart, 4);
          const fridayEnd = endOfDay(friday);
          query = query
            .gte('start_at', now.toISOString())
            .lte('start_at', fridayEnd.toISOString());
        } else if (hasWeekend) {
          // Events this weekend (Saturday & Sunday)
          const weekStart = startOfWeek(now, { weekStartsOn: 1 });
          const saturday = addDays(weekStart, 5);
          const sunday = addDays(weekStart, 6);
          const saturdayStart = startOfDay(saturday);
          const sundayEnd = endOfDay(sunday);
          query = query
            .gte('start_at', saturdayStart.toISOString())
            .lte('start_at', sundayEnd.toISOString());
        } else if (hasThisMonth) {
          // Events this month
          const monthEnd = endOfMonth(now);
          query = query
            .gte('start_at', now.toISOString())
            .lte('start_at', monthEnd.toISOString());
        } else {
          // Default: all upcoming events
          query = query.gte('end_at', now.toISOString());
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          setError(fetchError.message);
          return;
        }

        if (data && data.length > 0) {
          // Get coordinates
          const businessIds = [...new Set(data.map(event => event.business_id))];
          const { data: coordsData, error: coordsError } = await supabase
            .rpc('get_business_coordinates', { business_ids: businessIds });

          if (coordsError) {
            setError(coordsError.message);
            return;
          }

          const coordsMap = new Map(
            coordsData?.map((item: any) => [
              item.business_id,
              { lng: item.longitude, lat: item.latitude }
            ]) || []
          );

          let mappedEvents: EventLocation[] = data
            .filter(event => coordsMap.has(event.business_id))
            .map(event => {
              const coords = coordsMap.get(event.business_id)!;
              return {
                id: event.id,
                title: event.title,
                description: event.description,
                start_at: event.start_at,
                end_at: event.end_at,
                location: event.location,
                category: event.category || [],
                cover_image_url: event.cover_image_url,
                price: event.price,
                accepts_reservations: event.accepts_reservations,
                coordinates: [coords.lng, coords.lat] as [number, number],
                business: event.businesses ? {
                  id: event.businesses.id,
                  name: event.businesses.name,
                  logo_url: event.businesses.logo_url,
                  city: event.businesses.city,
                } : undefined,
              };
            });

          // Category filtering
          if (selectedCategories.length > 0) {
            mappedEvents = mappedEvents.filter(event =>
              doesCategoryMatchFilters(event.category, selectedCategories)
            );
          }

          // Access filtering
          const hasFreeEntrance = timeAccessFilters.includes("free_entrance");
          const hasWithReservations = timeAccessFilters.includes("with_reservations");
          const hasWithTickets = timeAccessFilters.includes("with_tickets");

          if (hasFreeEntrance || hasWithReservations || hasWithTickets) {
            mappedEvents = mappedEvents.filter(event => {
              if (hasFreeEntrance && (!event.price || event.price === 0)) return true;
              if (hasWithReservations && event.accepts_reservations) return true;
              if (hasWithTickets && event.price && event.price > 0) return true;
              return false;
            });
          }

          setEvents(mappedEvents);
        } else {
          setEvents([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events'
        },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCategories, timeAccessFilters]);

  return { events, loading, error };
};