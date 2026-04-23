import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Φάση 3 — Detect whether an event supports walk-in tickets.
 *
 * Walk-in is derived (not a column): an event supports walk-in when it has
 * at least one ticket_tier that is NOT linked to a reservation seating type.
 * We approximate this by treating tiers with quantity_total >= 999999 OR
 * tiers that are not referenced by any reservation seating_type as walk-in.
 *
 * Simpler heuristic (matches `get_event_walk_in_ticket_sold_counts`):
 * any tier with quantity_total >= 999999 is a walk-in tier. Plus we treat
 * the event as walk-in capable if event_type ∈ {reservation,
 * ticket_and_reservation, ticket_reservation} AND at least one tier exists
 * matching the heuristic.
 */
export function useEventSupportsWalkIn(eventId: string | null | undefined) {
  const [supports, setSupports] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    if (!eventId) {
      setSupports(false);
      return;
    }

    const check = async () => {
      setLoading(true);
      try {
        const { data: ev } = await supabase
          .from('events')
          .select('event_type')
          .eq('id', eventId)
          .maybeSingle();

        const evType = ev?.event_type ?? '';
        const isReservationOrHybrid =
          evType === 'reservation' ||
          evType === 'ticket_and_reservation' ||
          evType === 'ticket_reservation';

        if (!isReservationOrHybrid) {
          if (!cancelled) setSupports(false);
          return;
        }

        const { data: tiers } = await supabase
          .from('ticket_tiers')
          .select('id, quantity_total, active')
          .eq('event_id', eventId);

        // Walk-in tier heuristic: very large quantity_total (open inventory)
        const hasWalkInTier =
          (tiers ?? []).some(
            (t: any) => t.active && (t.quantity_total >= 999999 || t.quantity_total <= 0),
          );

        if (!cancelled) setSupports(hasWalkInTier);
      } catch (e) {
        console.error('useEventSupportsWalkIn error:', e);
        if (!cancelled) setSupports(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  return { supports, loading };
}
