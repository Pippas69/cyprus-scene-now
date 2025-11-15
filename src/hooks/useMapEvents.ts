import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isEventHappeningNow } from "@/lib/mapUtils";
import type { TimeFilterValue } from "@/components/map/TimeFilter";

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
  business?: {
    id: string;
    name: string;
    logo_url?: string;
    city: string;
  };
}

export const useMapEvents = (
  selectedCategories: string[],
  timeFilter: TimeFilterValue = "all"
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
            businesses (
              id,
              name,
              logo_url,
              city
            )
          `);

        // Time filtering
        const now = new Date();
        switch (timeFilter) {
          case "now":
            const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
            query = query
              .lte('start_at', oneHourLater.toISOString())
              .gte('end_at', now.toISOString());
            break;
          case "today":
            const endOfDay = new Date(now);
            endOfDay.setHours(23, 59, 59, 999);
            query = query
              .gte('start_at', now.toISOString())
              .lte('start_at', endOfDay.toISOString());
            break;
          case "week":
            const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            query = query
              .gte('start_at', now.toISOString())
              .lte('start_at', oneWeekLater.toISOString());
            break;
          case "month":
            const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            query = query
              .gte('start_at', now.toISOString())
              .lte('start_at', oneMonthLater.toISOString());
            break;
          default:
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
              event.category.some(cat => selectedCategories.includes(cat))
            );
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
  }, [selectedCategories, timeFilter]);

  return { events, loading, error };
};
