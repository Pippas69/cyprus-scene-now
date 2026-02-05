import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface SlotAvailability {
  slotTime: string;
  availableCapacity: number;
  isFullyBooked: boolean;
}

/**
 * Hook to fetch availability for all slots on a specific date.
 * Returns a map of slot times to their available capacity,
 * and a set of fully booked slots that should be hidden from the UI.
 */
export function useSlotAvailability(
  businessId: string | undefined,
  date: Date | undefined,
  slots: string[]
) {
  const [slotAvailability, setSlotAvailability] = useState<Map<string, SlotAvailability>>(new Map());
  const [fullyBookedSlots, setFullyBookedSlots] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!businessId || !date || slots.length === 0) {
      setSlotAvailability(new Map());
      setFullyBookedSlots(new Set());
      return;
    }

    const fetchAvailability = async () => {
      setLoading(true);
      try {
        const formattedDate = format(date, 'yyyy-MM-dd');
        
        // Fetch availability for all slots in parallel
        const availabilityPromises = slots.map(async (slotTime) => {
          const { data, error } = await supabase.rpc('get_slot_available_capacity', {
            p_business_id: businessId,
            p_date: formattedDate,
            p_slot_time: slotTime,
          });

          if (error) {
            console.error(`Error fetching capacity for ${slotTime}:`, error);
            return { slotTime, availableCapacity: 0, isFullyBooked: false };
          }

          const capacity = typeof data === 'number' ? data : Number(data ?? 0);
          return {
            slotTime,
            availableCapacity: capacity,
            isFullyBooked: capacity <= 0,
          };
        });

        const results = await Promise.all(availabilityPromises);
        
        const availabilityMap = new Map<string, SlotAvailability>();
        const bookedSet = new Set<string>();
        
        results.forEach((result) => {
          availabilityMap.set(result.slotTime, result);
          if (result.isFullyBooked) {
            bookedSet.add(result.slotTime);
          }
        });

        setSlotAvailability(availabilityMap);
        setFullyBookedSlots(bookedSet);
      } catch (error) {
        console.error('Error fetching slot availability:', error);
        setSlotAvailability(new Map());
        setFullyBookedSlots(new Set());
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [businessId, date, slots.join(',')]);

  return { slotAvailability, fullyBookedSlots, loading };
}
