import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { expandTimeRange, normalizeTime } from '@/lib/timeSlots';

/**
 * Hook to fetch closed slots for a business on a specific date.
 * Returns a Set of slot times that are closed (e.g., "06:00", "18:30").
 */
export function useClosedSlots(businessId: string | undefined, date: Date | undefined) {
  const [closedSlots, setClosedSlots] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!businessId || !date) {
      setClosedSlots(new Set());
      return;
    }

    const fetchClosedSlots = async () => {
      setLoading(true);
      try {
        const formattedDate = format(date, 'yyyy-MM-dd');

        // Fetch closures + business slot windows to correctly map a closed WINDOW
        // (e.g. one closure record for timeFrom) to all 30-min arrival times.
        const [{ data: closures, error: closuresError }, { data: business, error: businessError }] =
          await Promise.all([
            supabase
              .from('reservation_slot_closures')
              .select('slot_time')
              .eq('business_id', businessId)
              .eq('closure_date', formattedDate),
            supabase
              .from('businesses')
              .select('reservation_time_slots')
              .eq('id', businessId)
              .maybeSingle(),
          ]);

        if (closuresError) {
          console.error('Error fetching closed slots:', closuresError);
          setClosedSlots(new Set());
          return;
        }

        if (businessError) {
          console.error('Error fetching business slots:', businessError);
          // Fallback: still apply raw closures
          setClosedSlots(new Set((closures ?? []).map((row) => normalizeTime(row.slot_time))));
          return;
        }

        const configuredSlots = (business?.reservation_time_slots as any[] | null) ?? null;
        const out = new Set<string>();

        for (const row of closures ?? []) {
          const closureTime = normalizeTime(row.slot_time);

          // If we can map this closure to a configured slot window, expand to all 30-min intervals
          const matchingWindow = Array.isArray(configuredSlots)
            ? configuredSlots.find((s) => normalizeTime(s?.timeFrom ?? s?.time) === closureTime)
            : null;

          if (matchingWindow?.timeFrom && matchingWindow?.timeTo) {
            for (const t of expandTimeRange(matchingWindow.timeFrom, matchingWindow.timeTo, 30)) {
              out.add(t);
            }
          } else {
            // Otherwise treat it as a single closed time
            out.add(closureTime);
          }
        }

        setClosedSlots(out);
      } catch (error) {
        console.error('Error fetching closed slots:', error);
        setClosedSlots(new Set());
      } finally {
        setLoading(false);
      }
    };

    fetchClosedSlots();
  }, [businessId, date]);

  return { closedSlots, loading };
}
