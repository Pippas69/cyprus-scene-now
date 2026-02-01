import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

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
        
        const { data, error } = await supabase
          .from('reservation_slot_closures')
          .select('slot_time')
          .eq('business_id', businessId)
          .eq('closure_date', formattedDate);

        if (error) {
          console.error('Error fetching closed slots:', error);
          setClosedSlots(new Set());
        } else {
          const closedTimes = new Set(data?.map(row => row.slot_time) || []);
          setClosedSlots(closedTimes);
        }
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
